import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ecommerce',
  synchronize: true,
  entities: ['src/**/*.entity.ts'],
});

async function seed() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  await qr.connect();

  console.log('🌱 Seeding database...');

  // Admin user
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  await qr.query(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, loyalty_points)
    VALUES (gen_random_uuid(), 'admin@sportshop.com', $1, 'Admin', 'User', 'admin', true, true, 0)
    ON CONFLICT (email) DO NOTHING
  `, [passwordHash]);

  // Demo customer
  const customerHash = await bcrypt.hash('Customer123!', 12);
  await qr.query(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, loyalty_points)
    VALUES (gen_random_uuid(), 'customer@example.com', $1, 'John', 'Doe', 'customer', true, true, 150)
    ON CONFLICT (email) DO NOTHING
  `, [customerHash]);

  // Categories
  const categories = [
    { name: 'Running', slug: 'running', description: 'Running shoes, apparel, and accessories', emoji: '🏃' },
    { name: 'Fitness', slug: 'fitness', description: 'Gym equipment and fitness accessories', emoji: '💪' },
    { name: 'Outdoor', slug: 'outdoor', description: 'Outdoor and adventure sports gear', emoji: '🏕️' },
    { name: 'Team Sports', slug: 'team-sports', description: 'Basketball, soccer, and team sports equipment', emoji: '⚽' },
    { name: 'Water Sports', slug: 'water-sports', description: 'Swimming and water sports gear', emoji: '🏊' },
    { name: 'Cycling', slug: 'cycling', description: 'Bikes, helmets, and cycling accessories', emoji: '🚴' },
  ];

  for (const cat of categories) {
    await qr.query(`
      INSERT INTO categories (id, name, slug, description, is_active, sort_order)
      VALUES (gen_random_uuid(), $1, $2, $3, true, 0)
      ON CONFLICT (slug) DO NOTHING
    `, [cat.name, cat.slug, cat.description]);
  }

  // Get category IDs
  const catRows = await qr.query('SELECT id, slug FROM categories');
  const catMap: Record<string, string> = {};
  for (const row of catRows) catMap[row.slug] = row.id;

  // Products - 10 sports items
  const products = [
    {
      categorySlug: 'running',
      sku: 'RUN-001',
      name: 'Pro Runner Elite Shoes',
      slug: 'pro-runner-elite-shoes',
      description: 'Professional running shoes with advanced cushioning technology. Perfect for marathon training and competitive racing. Features breathable mesh upper and responsive foam midsole.',
      shortDescription: 'Professional marathon running shoes with advanced cushioning.',
      price: 149.99,
      compareAtPrice: 199.99,
      costPrice: 75.00,
      stockQuantity: 45,
      attributes: { brand: 'SpeedForce', material: 'Mesh & Foam', sizes: '6-13', weight: '280g', drop: '8mm' },
      isFeatured: true,
    },
    {
      categorySlug: 'fitness',
      sku: 'FIT-001',
      name: 'Adjustable Dumbbell Set 5-50lbs',
      slug: 'adjustable-dumbbell-set',
      description: 'Space-saving adjustable dumbbells that replace 15 sets of weights. Quick dial adjustment system. Premium steel construction with rubber coating for floor protection.',
      shortDescription: 'Space-saving adjustable dumbbells replacing 15 weight sets.',
      price: 299.99,
      compareAtPrice: 399.99,
      costPrice: 150.00,
      stockQuantity: 20,
      attributes: { brand: 'IronPro', material: 'Steel & Rubber', maxWeight: '50lbs', adjustment: 'Dial System' },
      isFeatured: true,
    },
    {
      categorySlug: 'outdoor',
      sku: 'OUT-001',
      name: 'Carbon Fiber Trekking Poles',
      slug: 'carbon-fiber-trekking-poles',
      description: 'Ultralight carbon fiber trekking poles with ergonomic cork grips. Collapsible to 60cm for easy packing. Includes interchangeable rubber and carbide tips.',
      shortDescription: 'Ultralight carbon fiber poles for hiking and trekking.',
      price: 89.99,
      compareAtPrice: null,
      costPrice: 40.00,
      stockQuantity: 35,
      attributes: { brand: 'SummitGear', material: 'Carbon Fiber', collapseLength: '60cm', grip: 'Cork', weight: '240g/pair' },
      isFeatured: false,
    },
    {
      categorySlug: 'team-sports',
      sku: 'BBALL-001',
      name: 'NBA Official Match Basketball',
      slug: 'nba-official-match-basketball',
      description: 'Official size and weight basketball with genuine leather construction. Approved for indoor and outdoor play. Superior grip and ball control.',
      shortDescription: 'Official NBA-size basketball with genuine leather.',
      price: 79.99,
      compareAtPrice: 99.99,
      costPrice: 35.00,
      stockQuantity: 60,
      attributes: { brand: 'HoopKing', material: 'Genuine Leather', size: 'Size 7', circumference: '29.5"' },
      isFeatured: true,
    },
    {
      categorySlug: 'water-sports',
      sku: 'SWIM-001',
      name: 'Competitive Racing Swim Goggles',
      slug: 'competitive-racing-swim-goggles',
      description: 'Competition-grade swim goggles with UV400 protection and anti-fog coating. Low-profile hydrodynamic design reduces drag. Includes 3 interchangeable nose bridges.',
      shortDescription: 'Competition swim goggles with UV protection and anti-fog.',
      price: 34.99,
      compareAtPrice: 49.99,
      costPrice: 12.00,
      stockQuantity: 80,
      attributes: { brand: 'AquaSpeed', UVprotection: 'UV400', lensType: 'Anti-fog', colors: 'Clear/Blue/Tinted' },
      isFeatured: false,
    },
    {
      categorySlug: 'cycling',
      sku: 'BIKE-001',
      name: 'Aero Road Bike Helmet',
      slug: 'aero-road-bike-helmet',
      description: 'Aerodynamic road cycling helmet with MIPS brain protection system. 18 ventilation channels for optimal airflow. Meets CPSC and CE EN1078 safety standards.',
      shortDescription: 'MIPS-equipped aerodynamic road cycling helmet.',
      price: 129.99,
      compareAtPrice: 169.99,
      costPrice: 60.00,
      stockQuantity: 25,
      attributes: { brand: 'VeloSafe', safety: 'MIPS', vents: '18', sizes: 'S/M/L', certification: 'CPSC CE EN1078' },
      isFeatured: true,
    },
    {
      categorySlug: 'fitness',
      sku: 'FIT-002',
      name: 'Premium Yoga Mat 6mm Non-Slip',
      slug: 'premium-yoga-mat-6mm',
      description: 'Extra-thick 6mm yoga mat with superior grip on both sides. Eco-friendly TPE material, free from PVC and toxic chemicals. Alignment lines printed for proper positioning.',
      shortDescription: 'Eco-friendly 6mm yoga mat with alignment guides.',
      price: 49.99,
      compareAtPrice: 69.99,
      costPrice: 20.00,
      stockQuantity: 100,
      attributes: { brand: 'ZenFlow', thickness: '6mm', material: 'TPE', dimensions: '183cm x 61cm', weight: '1.1kg' },
      isFeatured: false,
    },
    {
      categorySlug: 'running',
      sku: 'RUN-002',
      name: 'GPS Running Smart Watch',
      slug: 'gps-running-smart-watch',
      description: 'Advanced GPS running watch with heart rate monitor, VO2 max tracking, and 40+ sport modes. 14-day battery life in smartwatch mode, 20 hours GPS mode. Water resistant to 50m.',
      shortDescription: 'GPS running watch with heart rate and VO2 max tracking.',
      price: 349.99,
      compareAtPrice: 449.99,
      costPrice: 175.00,
      stockQuantity: 15,
      attributes: { brand: 'PulseTrack', GPS: 'Multi-GNSS', battery: '14 days / 20hr GPS', waterResistance: '50m', sportModes: '40+' },
      isFeatured: true,
    },
    {
      categorySlug: 'team-sports',
      sku: 'SOCCER-001',
      name: 'Match Pro Soccer Ball Size 5',
      slug: 'match-pro-soccer-ball',
      description: 'FIFA Quality Pro certified soccer ball. 32-panel hand-stitched construction with thermally bonded bladder for consistent shape retention. Suitable for all weather conditions.',
      shortDescription: 'FIFA Quality Pro certified soccer ball for match play.',
      price: 59.99,
      compareAtPrice: null,
      costPrice: 25.00,
      stockQuantity: 75,
      attributes: { brand: 'GoalForce', size: '5', certification: 'FIFA Quality Pro', panels: '32', stitching: 'Hand-stitched' },
      isFeatured: false,
    },
    {
      categorySlug: 'outdoor',
      sku: 'OUT-002',
      name: 'Waterproof Trail Running Backpack 20L',
      slug: 'waterproof-trail-running-backpack',
      description: 'Hydration-compatible trail running pack with 20L capacity. Integrated rain cover, chest and hip straps for stability. Multiple pockets with easy access design.',
      shortDescription: 'Hydration-compatible 20L trail running pack with rain cover.',
      price: 119.99,
      compareAtPrice: 149.99,
      costPrice: 55.00,
      stockQuantity: 30,
      attributes: { brand: 'TrailPro', capacity: '20L', material: 'Ripstop Nylon', hydration: 'Compatible 2L', weight: '650g' },
      isFeatured: true,
    },
  ];

  for (const p of products) {
    const categoryId = catMap[p.categorySlug];
    if (!categoryId) continue;

    const existing = await qr.query('SELECT id FROM products WHERE sku = $1', [p.sku]);
    if (existing.length > 0) {
      console.log(`  Product ${p.sku} already exists, skipping.`);
      continue;
    }

    await qr.query(`
      INSERT INTO products (
        id, category_id, sku, name, slug, description, short_description,
        price, compare_at_price, cost_price, stock_quantity, low_stock_threshold,
        attributes, is_active, is_featured, view_count, sold_count,
        average_rating, review_count, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, 5,
        $11, true, $12, 0, 0,
        0, 0, NOW(), NOW()
      )
    `, [
      categoryId, p.sku, p.name, p.slug, p.description, p.shortDescription,
      p.price, p.compareAtPrice, p.costPrice, p.stockQuantity,
      JSON.stringify(p.attributes), p.isFeatured,
    ]);

    console.log(`  ✓ Created product: ${p.name}`);
  }

  await qr.release();
  await AppDataSource.destroy();
  console.log('✅ Seed completed!');
  console.log('');
  console.log('Admin login: admin@sportshop.com / Admin123!');
  console.log('Customer login: customer@example.com / Customer123!');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
