import { z } from 'zod';

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  costPrice: z.number().positive().optional(),
  stockQuantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weight: z.number().positive().optional(),
  attributes: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

export const searchProductsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(['price_asc', 'price_desc', 'newest', 'rating', 'popularity']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── Bulk Import Schema (v1.0) ────────────────────────────────────────────────

export const BULK_IMPORT_FORMAT_VERSION = '1.0';

export const bulkImportImageSchema = z.object({
  /** Absolute URL to the image */
  url: z.string().url('Image URL must be a valid URL'),
  /** Descriptive alt text for accessibility and SEO */
  altText: z.string().max(255).optional(),
  /** Whether this is the primary/hero image shown in listings. First image is primary by default. */
  isPrimary: z.boolean().optional(),
  /** Display order — lower numbers appear first (0-based) */
  sortOrder: z.number().int().min(0).optional(),
});

export const bulkImportProductSchema = z.object({
  // ── Required ──────────────────────────────────────────────────────────
  /** Display name of the product */
  name: z.string().min(1).max(255),
  /** Unique stock-keeping unit. Used as the upsert key — existing SKUs are updated */
  sku: z.string().min(1).max(100),
  /** Category slug (e.g. "running", "fitness"). Must match an existing category */
  categorySlug: z.string().min(1),
  /** Selling price in USD */
  price: z.number().positive(),

  // ── Pricing (optional) ────────────────────────────────────────────────
  /** Original / crossed-out price shown alongside the selling price */
  compareAtPrice: z.number().positive().optional(),
  /** Internal cost price — not shown to customers */
  costPrice: z.number().positive().optional(),

  // ── Inventory (optional) ─────────────────────────────────────────────
  /** Units currently in stock. Default: 0 */
  stockQuantity: z.number().int().min(0).default(0),
  /** Alert threshold for low-stock warnings in admin. Default: 5 */
  lowStockThreshold: z.number().int().min(0).default(5),
  /** Product weight in kg — used for shipping calculations */
  weight: z.number().positive().optional(),

  // ── Content (optional) ────────────────────────────────────────────────
  /** Full product description (HTML supported) */
  description: z.string().optional(),
  /** Short description shown in product cards (max 500 chars) */
  shortDescription: z.string().max(500).optional(),
  /** Free-form key/value attributes, e.g. { "brand": "Nike", "sizes": "S,M,L" } */
  attributes: z.record(z.unknown()).default({}),

  // ── Images (optional) ─────────────────────────────────────────────────
  /** Product images. First entry is primary unless isPrimary is explicitly set */
  images: z.array(bulkImportImageSchema).max(10).default([]),

  // ── Flags (optional) ──────────────────────────────────────────────────
  /** Show in "Featured" homepage section. Default: false */
  isFeatured: z.boolean().default(false),
  /** Publish immediately. false = saved as draft. Default: false */
  isActive: z.boolean().default(false),
});

/** Top-level envelope for the standardized bulk import file */
export const bulkImportFileSchema = z.object({
  /** Format version — always "1.0" */
  version: z.literal(BULK_IMPORT_FORMAT_VERSION),
  /** Optional batch name/label for tracking purposes */
  batchName: z.string().max(100).optional(),
  /** The products to import */
  products: z.array(bulkImportProductSchema).min(1).max(500),
});

/** Validate and parse a bulk import file (throws ZodError on failure) */
export function parseBulkImportFile(raw: unknown) {
  // Support both envelope format { version, products } and bare array [...]
  if (Array.isArray(raw)) {
    return bulkImportFileSchema.parse({ version: BULK_IMPORT_FORMAT_VERSION, products: raw });
  }
  return bulkImportFileSchema.parse(raw);
}

export type BulkImportImage = z.infer<typeof bulkImportImageSchema>;
export type BulkImportProduct = z.infer<typeof bulkImportProductSchema>;
export type BulkImportFile = z.infer<typeof bulkImportFileSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;
