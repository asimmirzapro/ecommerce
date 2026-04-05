import {
  Injectable, ConflictException, UnauthorizedException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private tokenRepo: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName || null,
      lastName: dto.lastName || null,
    });
    await this.userRepo.save(user);
    return this.generateTokens(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email, isActive: true } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    // Find by iterating (we store hashes, so we must verify)
    const tokens = await this.tokenRepo.find({
      where: { revoked: false },
      relations: ['user'],
    });

    let foundToken: RefreshToken | null = null;
    for (const t of tokens) {
      if (!t.revoked && t.expiresAt > new Date()) {
        const match = await bcrypt.compare(refreshToken, t.tokenHash);
        if (match) { foundToken = t; break; }
      }
    }

    if (!foundToken) throw new UnauthorizedException('Invalid refresh token');

    foundToken.revoked = true;
    await this.tokenRepo.save(foundToken);

    return this.generateTokens(foundToken.user);
  }

  async logout(refreshToken: string) {
    const tokens = await this.tokenRepo.find({ where: { revoked: false } });
    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        t.revoked = true;
        await this.tokenRepo.save(t);
        break;
      }
    }
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', 'access-secret'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const rawRefresh = uuidv4();
    const tokenHash = await bcrypt.hash(rawRefresh, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const token = this.tokenRepo.create({ userId: user.id, tokenHash, expiresAt });
    await this.tokenRepo.save(token);

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
