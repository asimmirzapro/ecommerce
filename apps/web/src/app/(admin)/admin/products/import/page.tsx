'use client';
import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import {
  Upload, Plus, Trash2, Download, ChevronRight, CheckCircle, XCircle,
  ArrowLeft, Star, X, ImageIcon, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportImage {
  url: string;
  altText?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

interface ImportRow {
  _key: string;
  name: string;
  sku: string;
  categorySlug: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  stockQuantity: string;
  description: string;
  shortDescription: string;
  images: ImportImage[];
  attributes: string;       // JSON string
  isFeatured: boolean;
  isActive: boolean;
  _error?: string;
}

interface ImportResult {
  sku: string;
  name: string;
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const JSON_TEMPLATE = JSON.stringify({
  version: '1.0',
  batchName: 'My First Import',
  products: [
    {
      name: 'Example Running Shoe',
      sku: 'RUN-001',
      categorySlug: 'running',
      price: 99.99,
      compareAtPrice: 129.99,
      costPrice: 45.00,
      stockQuantity: 50,
      lowStockThreshold: 5,
      weight: 0.4,
      description: 'Full product description here. HTML is supported.',
      shortDescription: 'Short description shown in listing cards (max 500 chars).',
      isFeatured: false,
      isActive: false,
      attributes: { brand: 'BrandName', material: 'Mesh', sizes: 'US 7-13' },
      images: [
        { url: 'https://example.com/shoe-main.jpg', altText: 'Running shoe front view', isPrimary: true, sortOrder: 0 },
        { url: 'https://example.com/shoe-side.jpg', altText: 'Running shoe side view', sortOrder: 1 },
        { url: 'https://example.com/shoe-sole.jpg', altText: 'Running shoe sole', sortOrder: 2 },
      ],
    },
  ],
}, null, 2);

const CSV_TEMPLATE = [
  'name,sku,categorySlug,price,compareAtPrice,costPrice,stockQuantity,lowStockThreshold,weight,description,shortDescription,attributes,isFeatured,isActive,image1_url,image1_altText,image1_isPrimary,image2_url,image2_altText,image3_url,image3_altText',
  'Example Product,EX-001,running,99.99,129.99,45.00,50,5,0.4,Full description here,Short description,"{""brand"":""Nike""}",false,false,https://example.com/img1.jpg,Front view,true,https://example.com/img2.jpg,Side view,https://example.com/img3.jpg,Back view',
].join('\n');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    _key: Math.random().toString(36).slice(2),
    name: '', sku: '', categorySlug: '', price: '', compareAtPrice: '',
    costPrice: '', stockQuantity: '0', description: '', shortDescription: '',
    images: [], attributes: '{}', isFeatured: false, isActive: false,
    ...overrides,
  };
}

function parseCSV(text: string): ImportRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // CSV parser that handles quoted fields
  const parseLine = (line: string): string[] => {
    const values: string[] = [];
    let cur = '', inQ = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    return values;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });

    // Parse numbered image columns: image1_url, image1_altText, image1_isPrimary, ...
    const images: ImportImage[] = [];
    for (let n = 1; n <= 10; n++) {
      const url = obj[`image${n}_url`]?.trim();
      if (!url) break;
      images.push({
        url,
        altText: obj[`image${n}_altText`]?.trim() || undefined,
        isPrimary: obj[`image${n}_isPrimary`] === 'true' ? true : n === 1 ? true : undefined,
        sortOrder: n - 1,
      });
    }

    return newRow({
      name: obj.name, sku: obj.sku, categorySlug: obj.categorySlug,
      price: obj.price, compareAtPrice: obj.compareAtPrice, costPrice: obj.costPrice,
      stockQuantity: obj.stockQuantity || '0', description: obj.description,
      shortDescription: obj.shortDescription, images,
      attributes: obj.attributes || '{}',
      isFeatured: obj.isFeatured === 'true', isActive: obj.isActive === 'true',
    });
  });
}

function parseJSON(text: string): ImportRow[] {
  const raw = JSON.parse(text);
  // Support envelope { version, products } or bare array
  const items: any[] = Array.isArray(raw) ? raw : (raw.products ?? []);

  return items.map((item: any) => {
    // Parse images — support array of objects or strings
    let images: ImportImage[] = [];
    if (Array.isArray(item.images)) {
      images = item.images.map((img: any, i: number) =>
        typeof img === 'string'
          ? { url: img, isPrimary: i === 0, sortOrder: i }
          : { url: img.url ?? '', altText: img.altText, isPrimary: img.isPrimary, sortOrder: img.sortOrder ?? i }
      );
    }

    return newRow({
      name: item.name ?? '', sku: item.sku ?? '',
      categorySlug: item.categorySlug ?? item.category ?? '',
      price: String(item.price ?? ''), compareAtPrice: String(item.compareAtPrice ?? ''),
      costPrice: String(item.costPrice ?? ''), stockQuantity: String(item.stockQuantity ?? '0'),
      description: item.description ?? '', shortDescription: item.shortDescription ?? '',
      images,
      attributes: typeof item.attributes === 'object'
        ? JSON.stringify(item.attributes)
        : (item.attributes ?? '{}'),
      isFeatured: Boolean(item.isFeatured), isActive: Boolean(item.isActive),
    });
  });
}

function rowToPayload(row: ImportRow, publishAll: boolean) {
  let attrs = {};
  try { attrs = JSON.parse(row.attributes || '{}'); } catch {}
  return {
    name: row.name,
    sku: row.sku,
    categorySlug: row.categorySlug,
    price: parseFloat(row.price) || 0,
    compareAtPrice: row.compareAtPrice ? parseFloat(row.compareAtPrice) : undefined,
    costPrice: row.costPrice ? parseFloat(row.costPrice) : undefined,
    stockQuantity: parseInt(row.stockQuantity) || 0,
    description: row.description || undefined,
    shortDescription: row.shortDescription || undefined,
    attributes: attrs,
    isFeatured: row.isFeatured,
    isActive: publishAll ? true : row.isActive,
    images: row.images.map((img, i) => ({
      url: img.url,
      altText: img.altText || undefined,
      isPrimary: img.isPrimary ?? i === 0,
      sortOrder: img.sortOrder ?? i,
    })),
  };
}

// ─── Image Editor Modal ───────────────────────────────────────────────────────

function ImageEditorModal({
  images, onSave, onClose,
}: {
  images: ImportImage[];
  onSave: (images: ImportImage[]) => void;
  onClose: () => void;
}) {
  const [imgs, setImgs] = useState<ImportImage[]>(images.map((img, i) => ({ ...img, sortOrder: img.sortOrder ?? i })));

  const addImage = () => setImgs(prev => [...prev, { url: '', altText: '', isPrimary: prev.length === 0, sortOrder: prev.length }]);
  const remove = (i: number) => setImgs(prev => {
    const next = prev.filter((_, j) => j !== i);
    // Re-assign primary if removed was primary
    if (prev[i].isPrimary && next.length > 0) next[0] = { ...next[0], isPrimary: true };
    return next;
  });
  const setPrimary = (i: number) => setImgs(prev => prev.map((img, j) => ({ ...img, isPrimary: j === i })));
  const update = (i: number, field: keyof ImportImage, value: any) =>
    setImgs(prev => prev.map((img, j) => j === i ? { ...img, [field]: value } : img));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-800">Edit Product Images</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {imgs.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No images yet. Add one below.</p>
          )}
          {imgs.map((img, i) => (
            <div key={i} className={`border rounded-lg p-3 ${img.isPrimary ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-500 w-5">{i + 1}</span>
                <button
                  onClick={() => setPrimary(i)}
                  title={img.isPrimary ? 'Primary image' : 'Set as primary'}
                  className={`transition-colors ${img.isPrimary ? 'text-orange-500' : 'text-gray-300 hover:text-orange-400'}`}
                >
                  <Star className="w-4 h-4" fill={img.isPrimary ? 'currentColor' : 'none'} />
                </button>
                {img.isPrimary && <span className="text-xs text-orange-500 font-medium">Primary</span>}
                <button onClick={() => remove(i)} className="ml-auto text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <input
                  value={img.url}
                  onChange={e => update(i, 'url', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
                <input
                  value={img.altText ?? ''}
                  onChange={e => update(i, 'altText', e.target.value)}
                  placeholder="Alt text (for accessibility & SEO)"
                  className="w-full border rounded px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t flex items-center justify-between gap-3 bg-gray-50">
          <button onClick={addImage} disabled={imgs.length >= 10}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 disabled:opacity-40 transition-colors">
            <Plus className="w-4 h-4" /> Add Image {imgs.length > 0 && `(${imgs.length}/10)`}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-1.5 text-sm border rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={() => { onSave(imgs); onClose(); }}
              className="px-4 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
              Save Images
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Format Reference ─────────────────────────────────────────────────────────

function FormatReference() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
        <span className="flex items-center gap-2"><Info className="w-4 h-4 text-gray-400" /> Format Reference</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="p-4 bg-white text-xs space-y-4">
          <div>
            <p className="font-semibold text-gray-700 mb-2">JSON Envelope (recommended)</p>
            <p className="text-gray-500 mb-2">Wrap your products in the standard envelope for versioning and batch tracking:</p>
            <pre className="bg-gray-50 rounded p-3 text-gray-600 overflow-x-auto">{`{
  "version": "1.0",
  "batchName": "Spring 2024 Collection",
  "products": [ ... ]
}`}</pre>
            <p className="text-gray-400 mt-1">A bare array <code className="bg-gray-100 px-1 rounded">[ ... ]</code> is also accepted for backward compatibility.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Product Fields</p>
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-50">
                <th className="text-left p-2 border font-medium text-gray-600">Field</th>
                <th className="text-left p-2 border font-medium text-gray-600">Required</th>
                <th className="text-left p-2 border font-medium text-gray-600">Description</th>
              </tr></thead>
              <tbody className="text-gray-500">
                {[
                  ['name', 'Yes', 'Display name (max 255 chars)'],
                  ['sku', 'Yes', 'Unique stock-keeping unit — used as the upsert key'],
                  ['categorySlug', 'Yes', 'Category slug, e.g. "running", "fitness"'],
                  ['price', 'Yes', 'Selling price in USD (positive number)'],
                  ['compareAtPrice', 'No', 'Crossed-out original price shown to shoppers'],
                  ['costPrice', 'No', 'Internal cost — not shown to customers'],
                  ['stockQuantity', 'No', 'Units in stock (default: 0)'],
                  ['lowStockThreshold', 'No', 'Low-stock alert level in admin (default: 5)'],
                  ['weight', 'No', 'Weight in kg for shipping'],
                  ['description', 'No', 'Full description — HTML supported'],
                  ['shortDescription', 'No', 'Card description (max 500 chars)'],
                  ['attributes', 'No', 'Free-form key/value object, e.g. {"brand":"Nike"}'],
                  ['isFeatured', 'No', 'Show in Featured section (default: false)'],
                  ['isActive', 'No', 'Publish immediately (default: false = draft)'],
                  ['images', 'No', 'Array of image objects (max 10) — see below'],
                ].map(([f, r, d]) => (
                  <tr key={f}><td className="p-2 border font-mono">{f}</td><td className="p-2 border">{r}</td><td className="p-2 border">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">Image Object Fields</p>
            <table className="w-full border-collapse">
              <thead><tr className="bg-gray-50">
                <th className="text-left p-2 border font-medium text-gray-600">Field</th>
                <th className="text-left p-2 border font-medium text-gray-600">Description</th>
              </tr></thead>
              <tbody className="text-gray-500">
                {[
                  ['url', 'Absolute URL to the image (required)'],
                  ['altText', 'Descriptive alt text for accessibility and SEO'],
                  ['isPrimary', 'true = hero image shown in listings. First image is primary by default.'],
                  ['sortOrder', 'Display order — lower = first (0-based)'],
                ].map(([f, d]) => (
                  <tr key={f}><td className="p-2 border font-mono">{f}</td><td className="p-2 border">{d}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-2">CSV Image Columns</p>
            <p className="text-gray-500 mb-1">Use numbered column sets for up to 10 images per product:</p>
            <pre className="bg-gray-50 rounded p-3 text-gray-600 overflow-x-auto">{`image1_url, image1_altText, image1_isPrimary
image2_url, image2_altText
image3_url, image3_altText
...
image10_url, image10_altText`}</pre>
            <p className="text-gray-400 mt-1">The first image (image1) is primary by default unless <code className="bg-gray-100 px-1 rounded">image1_isPrimary=false</code>.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table columns (excluding images) ─────────────────────────────────────────

const COLUMNS = [
  { key: 'name', label: 'Name', required: true, width: 'w-40' },
  { key: 'sku', label: 'SKU', required: true, width: 'w-28' },
  { key: 'categorySlug', label: 'Category', required: true, width: 'w-32' },
  { key: 'price', label: 'Price', required: true, width: 'w-24' },
  { key: 'compareAtPrice', label: 'Compare At', width: 'w-24' },
  { key: 'stockQuantity', label: 'Stock', width: 'w-20' },
  { key: 'description', label: 'Description', width: 'w-48' },
  { key: 'shortDescription', label: 'Short Desc', width: 'w-40' },
  { key: 'attributes', label: 'Attributes (JSON)', width: 'w-40' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'load' | 'review' | 'done'>('load');
  const [rows, setRows] = useState<ImportRow[]>([newRow()]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [publishAll, setPublishAll] = useState(false);
  const [jsonPaste, setJsonPaste] = useState('');
  const [activeTab, setActiveTab] = useState<'manual' | 'json'>('manual');
  const [editingImages, setEditingImages] = useState<string | null>(null); // row _key

  const { data: cats } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get('/admin/categories').then(r => {
      const flat: any[] = [];
      const walk = (items: any[]) => items.forEach(c => { flat.push(c); walk(c.children || []); });
      walk(r.data);
      return flat;
    }),
  });

  const importMutation = useMutation({
    mutationFn: (payload: { items: any[]; publishAll: boolean }) =>
      api.post('/admin/products/bulk-import', payload).then(r => r.data),
    onSuccess: (data) => {
      setResults(data.results);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['admin', 'products'] });
      toast.success(`Imported ${data.imported} products${data.failed ? `, ${data.failed} failed` : ''}`);
    },
    onError: () => toast.error('Import failed'),
  });

  // ── File handling ─────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text);
        if (!parsed.length) { toast.error('No rows found in file'); return; }
        setRows(parsed);
        setStep('review');
        toast.success(`Loaded ${parsed.length} row${parsed.length > 1 ? 's' : ''}`);
      } catch { toast.error('Failed to parse file — check format'); }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handlePasteJSON = () => {
    try {
      const parsed = parseJSON(jsonPaste);
      if (!parsed.length) { toast.error('No items found'); return; }
      setRows(parsed);
      setStep('review');
    } catch { toast.error('Invalid JSON'); }
  };

  const downloadTemplate = (format: 'json' | 'csv') => {
    const content = format === 'json' ? JSON_TEMPLATE : CSV_TEMPLATE;
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product-import-template.${format}`;
    a.click();
  };

  // ── Row editing ───────────────────────────────────────────────────────
  const updateRow = (key: string, field: keyof ImportRow, value: any) =>
    setRows(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r));

  const removeRow = (key: string) => setRows(prev => prev.filter(r => r._key !== key));
  const addRow = () => setRows(prev => [...prev, newRow()]);

  const validateRows = () => {
    let valid = true;
    setRows(prev => prev.map(r => {
      const errors: string[] = [];
      if (!r.name.trim()) errors.push('name');
      if (!r.sku.trim()) errors.push('sku');
      if (!r.categorySlug.trim()) errors.push('category');
      if (!r.price || isNaN(parseFloat(r.price))) errors.push('price');
      if (errors.length) { valid = false; return { ...r, _error: `Missing: ${errors.join(', ')}` }; }
      return { ...r, _error: undefined };
    }));
    return valid;
  };

  const handleImport = () => {
    if (!validateRows()) { toast.error('Fix validation errors before importing'); return; }
    const items = rows.map(row => rowToPayload(row, publishAll));
    importMutation.mutate({ items, publishAll });
  };

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-full">
      {/* Image editor modal */}
      {editingImages && (() => {
        const row = rows.find(r => r._key === editingImages);
        if (!row) return null;
        return (
          <ImageEditorModal
            images={row.images}
            onSave={imgs => updateRow(editingImages, 'images', imgs)}
            onClose={() => setEditingImages(null)}
          />
        );
      })()}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Bulk Import Products</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload a CSV/JSON file, paste JSON, or enter products manually</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['load', 'review', 'done'] as const).map((s, i) => {
          const stepOrder = ['load', 'review', 'done'];
          const isDone = stepOrder.indexOf(step) > i;
          const isActive = step === s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-sm font-medium ${isActive ? 'text-orange-600' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-orange-100 text-orange-600' : isDone ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {i + 1}
                </div>
                {s === 'load' ? 'Load Data' : s === 'review' ? 'Review & Edit' : 'Results'}
              </div>
              {i < 2 && <ChevronRight className="w-4 h-4 text-gray-300" />}
            </div>
          );
        })}
      </div>

      {/* ── Step 1: Load ── */}
      {step === 'load' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload card */}
            <div className="bg-white border rounded-xl p-6">
              <h2 className="font-semibold mb-4">Upload File</h2>
              <div
                className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors"
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">Supports JSON (<code>.json</code>) and CSV (<code>.csv</code>)</p>
                <input ref={fileRef} type="file" accept=".json,.csv" className="hidden" onChange={handleFileInput} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => downloadTemplate('json')} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-600 border rounded px-3 py-1.5 hover:border-orange-300 transition-colors">
                  <Download className="w-3.5 h-3.5" /> JSON Template
                </button>
                <button onClick={() => downloadTemplate('csv')} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-orange-600 border rounded px-3 py-1.5 hover:border-orange-300 transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV Template
                </button>
              </div>
            </div>

            {/* Tabs: paste JSON or manual entry */}
            <div className="bg-white border rounded-xl p-6">
              <div className="flex border-b mb-4">
                {(['json', 'manual'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`pb-2 px-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    {tab === 'json' ? 'Paste JSON' : 'Manual Entry'}
                  </button>
                ))}
              </div>

              {activeTab === 'json' ? (
                <div>
                  <textarea
                    value={jsonPaste}
                    onChange={e => setJsonPaste(e.target.value)}
                    placeholder={'{\n  "version": "1.0",\n  "products": [\n    { "name": "...", "sku": "...", "categorySlug": "...", "price": 99.99 }\n  ]\n}'}
                    className="w-full h-48 font-mono text-xs border rounded-lg p-3 resize-none focus:outline-none focus:border-orange-400"
                  />
                  <button onClick={handlePasteJSON} disabled={!jsonPaste.trim()}
                    className="mt-3 w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors">
                    Parse & Review
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-4">Start with a blank table and fill in your products row by row.</p>
                  <button onClick={() => { setRows([newRow(), newRow(), newRow()]); setStep('review'); }}
                    className="w-full bg-orange-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-orange-600 transition-colors">
                    Open Table Editor
                  </button>
                </div>
              )}
            </div>
          </div>

          <FormatReference />
        </div>
      )}

      {/* ── Step 2: Review ── */}
      {step === 'review' && (
        <div>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4 bg-white border rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{rows.length} product{rows.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setStep('load')} className="text-xs text-gray-500 hover:text-gray-700 underline">← Back</button>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <div
                  onClick={() => setPublishAll(v => !v)}
                  className={`relative inline-flex w-10 h-5 rounded-full transition-colors cursor-pointer ${publishAll ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${publishAll ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium">{publishAll ? 'Publish all' : 'Save as drafts'}</span>
              </label>
              <button onClick={addRow} className="flex items-center gap-1 text-sm text-orange-600 border border-orange-200 rounded-lg px-3 py-1.5 hover:bg-orange-50 transition-colors">
                <Plus className="w-4 h-4" /> Add Row
              </button>
              <button
                onClick={handleImport}
                disabled={importMutation.isPending || rows.length === 0}
                className="flex items-center gap-2 bg-orange-500 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {importMutation.isPending ? 'Importing…' : `Import ${rows.length} Products`}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium text-gray-500 w-8">#</th>
                    {COLUMNS.map(col => (
                      <th key={col.key} className={`text-left px-3 py-2.5 font-medium text-gray-600 ${col.width}`}>
                        {col.label}{col.required && <span className="text-red-400 ml-0.5">*</span>}
                      </th>
                    ))}
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600 w-24">Images</th>
                    <th className="px-3 py-2.5 text-center font-medium text-gray-500 w-16">Featured</th>
                    <th className="px-3 py-2.5 text-center font-medium text-gray-500 w-16">Publish</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, idx) => (
                    <tr key={row._key} className={row._error ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-400 text-center">
                        {row._error
                          ? <span title={row._error} className="text-red-400 cursor-help">!</span>
                          : idx + 1}
                      </td>
                      {COLUMNS.map(col => (
                        <td key={col.key} className="px-2 py-1.5">
                          {col.key === 'categorySlug' ? (
                            <select
                              value={row.categorySlug}
                              onChange={e => updateRow(row._key, 'categorySlug', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-400 bg-white"
                            >
                              <option value="">Select…</option>
                              {(cats || []).map((c: any) => (
                                <option key={c.id} value={c.slug}>{c.name}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              value={(row as any)[col.key]}
                              onChange={e => updateRow(row._key, col.key as keyof ImportRow, e.target.value)}
                              placeholder={col.key === 'attributes' ? '{"brand":"..."}' : ''}
                              className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-400 ${['price', 'compareAtPrice', 'stockQuantity'].includes(col.key) ? 'text-right' : ''}`}
                            />
                          )}
                        </td>
                      ))}
                      {/* Images cell */}
                      <td className="px-2 py-1.5 text-center">
                        <button
                          onClick={() => setEditingImages(row._key)}
                          className="inline-flex items-center gap-1 text-xs border rounded px-2 py-1 hover:border-orange-300 hover:text-orange-600 transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" />
                          {row.images.length > 0 ? (
                            <span className="font-medium text-orange-600">{row.images.length}</span>
                          ) : (
                            <span className="text-gray-400">Add</span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={row.isFeatured}
                          onChange={e => updateRow(row._key, 'isFeatured', e.target.checked)}
                          className="rounded" />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={publishAll || row.isActive}
                          disabled={publishAll}
                          onChange={e => updateRow(row._key, 'isActive', e.target.checked)}
                          className="rounded" />
                      </td>
                      <td className="px-2 py-1.5">
                        <button onClick={() => removeRow(row._key)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t bg-gray-50">
              <button onClick={addRow} className="text-xs text-gray-500 hover:text-orange-600 transition-colors flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add another row
              </button>
            </div>
          </div>

          {rows.some(r => r._error) && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
              Fix highlighted rows before importing.
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Results ── */}
      {step === 'done' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total', value: results.length, color: 'text-gray-700', bg: 'bg-white' },
              { label: 'Imported', value: results.filter(r => r.success).length, color: 'text-green-700', bg: 'bg-green-50' },
              { label: 'Failed', value: results.filter(r => !r.success).length, color: 'text-red-700', bg: 'bg-red-50' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} border rounded-xl p-4 text-center`}>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-8" />
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r, i) => (
                  <tr key={i} className={r.success ? '' : 'bg-red-50'}>
                    <td className="px-4 py-2.5">
                      {r.success
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-400" />}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.sku}</td>
                    <td className="px-4 py-2.5 text-xs">
                      {r.success
                        ? <span className="text-green-600">Imported successfully</span>
                        : <span className="text-red-500">{r.error}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => { setStep('load'); setRows([newRow()]); setResults([]); }}
              className="border rounded-lg px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
              Import More
            </button>
            <Link href="/admin/products"
              className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors">
              View Products
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
