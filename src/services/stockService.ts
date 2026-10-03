import { StockProduct, StockSheetConfig, DEFAULT_STOCK_CONFIG, CopyPriceSettings, DEFAULT_COPY_SETTINGS } from '../types/stock';
import { getAccessToken } from './googleAuth';

const STOCK_CACHE_KEY = 'quicknotes_stock_cache_v2';
const STOCK_CONFIG_KEY = 'quicknotes_stock_config_v2';
const COPY_SETTINGS_KEY = 'quicknotes_copy_settings_v1';

export const SEED_STOCK_PRODUCTS: StockProduct[] = [
  {
    id: 'prod_1',
    sku: 'SKU-1001',
    name: 'Wireless Mouse Ergonomic Silent Click RGB Dual Mode',
    unit: 'pcs',
    hpp: 110000,
    formattedHpp: 'Rp 110.000',
    hargaEceran: 185000,
    formattedEceran: 'Rp 185.000',
    hargaGrosir: 160000,
    formattedGrosir: 'Rp 160.000',
    hargaPartai: 145000,
    formattedPartai: 'Rp 145.000',
    price: 185000,
    formattedPrice: 'Rp 185.000',
    stock: 38,
    rawStock: 38,
    status: 'in_stock',
    category: 'Aksesoris Komputer',
    notes: 'Garansi 1 tahun',
  },
  {
    id: 'prod_2',
    sku: 'SKU-1002',
    name: 'Mechanical Keyboard 75% Hot-Swappable White RGB',
    unit: 'unit',
    hpp: 380000,
    formattedHpp: 'Rp 380.000',
    hargaEceran: 590000,
    formattedEceran: 'Rp 590.000',
    hargaGrosir: 520000,
    formattedGrosir: 'Rp 520.000',
    hargaPartai: 480000,
    formattedPartai: 'Rp 480.000',
    price: 590000,
    formattedPrice: 'Rp 590.000',
    stock: 12,
    rawStock: 12,
    status: 'in_stock',
    category: 'Aksesoris Komputer',
    notes: 'Red switch',
  },
  {
    id: 'prod_3',
    sku: 'SKU-1003',
    name: 'USB-C Hub 8-in-1 4K HDMI 100W PD Aluminum Shell',
    unit: 'pcs',
    hpp: 195000,
    formattedHpp: 'Rp 195.000',
    hargaEceran: 320000,
    formattedEceran: 'Rp 320.000',
    hargaGrosir: 280000,
    formattedGrosir: 'Rp 280.000',
    hargaPartai: 250000,
    formattedPartai: 'Rp 250.000',
    price: 320000,
    formattedPrice: 'Rp 320.000',
    stock: 4,
    rawStock: 4,
    status: 'low_stock',
    category: 'Kabel & Adaptor',
    notes: 'Stok kritis sisa 4',
  },
  {
    id: 'prod_4',
    sku: 'SKU-1004',
    name: 'Noise Cancelling Headphone Bluetooth 5.3 ANC Over-Ear',
    unit: 'unit',
    hpp: 490000,
    formattedHpp: 'Rp 490.000',
    hargaEceran: 750000,
    formattedEceran: 'Rp 750.000',
    hargaGrosir: 675000,
    formattedGrosir: 'Rp 675.000',
    hargaPartai: 620000,
    formattedPartai: 'Rp 620.000',
    price: 750000,
    formattedPrice: 'Rp 750.000',
    stock: 0,
    rawStock: 0,
    status: 'out_of_stock',
    category: 'Audio',
    notes: 'Habis terjual (PO jalan)',
  },
  {
    id: 'prod_5',
    sku: 'SKU-1005',
    name: 'GaN Fast Charger 65W Dual Type-C + USB-A Quick Charge',
    unit: 'pcs',
    hpp: 125000,
    formattedHpp: 'Rp 125.000',
    hargaEceran: 210000,
    formattedEceran: 'Rp 210.000',
    hargaGrosir: 180000,
    formattedGrosir: 'Rp 180.000',
    hargaPartai: 160000,
    formattedPartai: 'Rp 160.000',
    price: 210000,
    formattedPrice: 'Rp 210.000',
    stock: 28,
    rawStock: 28,
    status: 'in_stock',
    category: 'Kabel & Adaptor',
  },
  {
    id: 'prod_6',
    sku: 'SKU-1006',
    name: 'Aluminium Laptop Stand Foldable Portable Multi-Angle',
    unit: 'pcs',
    hpp: 75000,
    formattedHpp: 'Rp 75.000',
    hargaEceran: 135000,
    formattedEceran: 'Rp 135.000',
    hargaGrosir: 115000,
    formattedGrosir: 'Rp 115.000',
    hargaPartai: 98000,
    formattedPartai: 'Rp 98.000',
    price: 135000,
    formattedPrice: 'Rp 135.000',
    stock: 3,
    rawStock: 3,
    status: 'low_stock',
    category: 'Perlengkapan Kerja',
  }
];

export function getStoredStockConfig(): StockSheetConfig {
  try {
    const raw = localStorage.getItem(STOCK_CONFIG_KEY);
    if (!raw) return DEFAULT_STOCK_CONFIG;
    return { ...DEFAULT_STOCK_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STOCK_CONFIG;
  }
}

export function saveStoredStockConfig(config: Partial<StockSheetConfig>): void {
  try {
    const current = getStoredStockConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(STOCK_CONFIG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save stock config:', err);
  }
}

export function getStoredCopySettings(): CopyPriceSettings {
  try {
    const raw = localStorage.getItem(COPY_SETTINGS_KEY);
    if (!raw) return DEFAULT_COPY_SETTINGS;
    return { ...DEFAULT_COPY_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_COPY_SETTINGS;
  }
}

export function saveStoredCopySettings(settings: Partial<CopyPriceSettings>): void {
  try {
    const current = getStoredCopySettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(COPY_SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save copy settings:', err);
  }
}

export function getCachedStockProducts(): StockProduct[] {
  try {
    const raw = localStorage.getItem(STOCK_CACHE_KEY);
    if (!raw) {
      localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(SEED_STOCK_PRODUCTS));
      return SEED_STOCK_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_STOCK_PRODUCTS;
  } catch {
    return SEED_STOCK_PRODUCTS;
  }
}

export function cacheStockProducts(products: StockProduct[]): void {
  try {
    localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify(products));
  } catch (err) {
    console.error('Failed to cache stock products:', err);
  }
}

export function parsePriceValue(val: any): number {
  let num = 0;
  if (typeof val === 'number') {
    num = isNaN(val) ? 0 : val;
  } else if (val) {
    const str = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(str);
    num = isNaN(parsed) ? 0 : parsed;
  }
  // If price in sheet is written in thousands (ribuan, e.g. 20 means 20.000, 185 means 185.000), multiply by 1000
  if (num > 0 && num < 1000) {
    return num * 1000;
  }
  return num;
}

export function parseQtyValue(val: any): number {
  let num = 0;
  if (typeof val === 'number') {
    num = isNaN(val) ? 0 : val;
  } else if (val) {
    const str = String(val).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(str);
    num = isNaN(parsed) ? 0 : parsed;
  }
  // Qty must NEVER be multiplied by 1000 (keep original sheet quantity like 38, 4, 12)
  return num;
}

export function formatRupiah(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return 'Rp 0';
  if (typeof num === 'string') {
    if (num.toLowerCase().includes('rp')) return num.trim();
    const parsed = parsePriceValue(num);
    num = parsed;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export async function fetchStockProductsFromSheet(config?: StockSheetConfig): Promise<{
  success: boolean;
  products: StockProduct[];
  source: 'google_sheets' | 'cache' | 'seed';
  error?: string;
  totalRows?: number;
}> {
  const currentConfig = config || getStoredStockConfig();
  const spreadsheetId = currentConfig.spreadsheetId.trim() || DEFAULT_STOCK_CONFIG.spreadsheetId;
  const sheetName = currentConfig.sheetName.trim() || DEFAULT_STOCK_CONFIG.sheetName;

  const map = {
    sku: 0,
    name: 2,
    unit: 3,
    hpp: 7,
    eceran: 10,
    grosir: 11,
    partai: 12,
    qty: 14,
  };

  const token = await getAccessToken();

  if (!token) {
    const cached = getCachedStockProducts();
    return {
      success: true,
      products: cached,
      source: 'cache',
      error: 'Masuk dengan Akun Google untuk menyinkronkan data langsung dari Google Sheets "STOCK LIST".',
      totalRows: cached.length,
    };
  }

  try {
    const range = encodeURIComponent(`'${sheetName}'!A1:Z1000`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error(`Sheet "${sheetName}" atau Spreadsheet ID tidak ditemukan.`);
      }
      if (res.status === 403) {
        throw new Error('Izin akses ditolak. Pastikan akun Google Anda memiliki akses ke spreadsheet ini.');
      }
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${res.status}: Gagal memuat Google Sheet.`);
    }

    const data = await res.json();
    const rows: any[][] = data.values || [];

    if (rows.length <= 1) {
      throw new Error(`Sheet "${sheetName}" kosong atau belum memiliki data baris.`);
    }

    const firstRow = rows[0].map((c: any) => String(c || '').trim().toLowerCase());
    const isFirstRowHeader = firstRow.some((c: string) => 
      c.includes('sku') || c.includes('nama') || c.includes('produk') || c.includes('qty') || c.includes('stok') || c.includes('eceran')
    );

    const startRowIndex = isFirstRowHeader ? 1 : 0;
    const parsedProducts: StockProduct[] = [];

    for (let i = startRowIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || row.every((c: any) => !c || String(c).trim() === '')) {
        continue;
      }

      const rawSku = row[map.sku] ? String(row[map.sku]).trim() : '';
      const rawName = row[map.name] ? String(row[map.name]).trim() : '';

      if (!rawSku && !rawName) continue;

      const finalSku = rawSku || `ITEM-${(i + 1).toString().padStart(3, '0')}`;
      const finalName = rawName || `Produk ${finalSku}`;
      const rawUnit = row[map.unit] ? String(row[map.unit]).trim() : 'pcs';

      const hppNum = parsePriceValue(row[map.hpp]);
      const eceranNum = parsePriceValue(row[map.eceran]);
      const grosirNum = parsePriceValue(row[map.grosir]);
      const partaiNum = parsePriceValue(row[map.partai]);
      const primaryPrice = eceranNum || grosirNum || partaiNum || hppNum || 0;

      const rawQty = row[map.qty];
      const stockNum = parseQtyValue(rawQty);

      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (stockNum <= 0) {
        status = 'out_of_stock';
      } else if (stockNum <= 5) {
        status = 'low_stock';
      }

      parsedProducts.push({
        id: `sheet_prod_${i}_${finalSku}`,
        sku: finalSku,
        name: finalName,
        unit: rawUnit,
        hpp: hppNum,
        formattedHpp: formatRupiah(hppNum),
        hargaEceran: eceranNum,
        formattedEceran: formatRupiah(eceranNum),
        hargaGrosir: grosirNum,
        formattedGrosir: formatRupiah(grosirNum),
        hargaPartai: partaiNum,
        formattedPartai: formatRupiah(partaiNum),
        price: primaryPrice,
        formattedPrice: formatRupiah(primaryPrice),
        stock: stockNum,
        rawStock: rawQty !== undefined ? rawQty : stockNum,
        status,
        category: row[1] ? String(row[1]).trim() : undefined,
      });
    }

    if (parsedProducts.length > 0) {
      cacheStockProducts(parsedProducts);
      saveStoredStockConfig({ lastSyncedAt: Date.now() });
      return {
        success: true,
        products: parsedProducts,
        source: 'google_sheets',
        totalRows: parsedProducts.length,
      };
    } else {
      throw new Error('Tidak ada baris produk valid yang ditemukan pada kolom SKU / Nama Produk.');
    }
  } catch (err: any) {
    console.warn('Error fetching stock from Google Sheet, using cache:', err);
    const cached = getCachedStockProducts();
    return {
      success: false,
      products: cached,
      source: 'cache',
      error: err?.message || 'Gagal menyinkronkan dengan Google Sheets.',
      totalRows: cached.length,
    };
  }
}

export function generateProductSnippet(product: StockProduct, settings?: CopyPriceSettings): string {
  const currentSettings = settings || getStoredCopySettings();
  let text = '';

  if (currentSettings.includeSkuName) {
    text += `📦 *[${product.sku}] ${product.name}*\n`;
  }

  if (currentSettings.includeQty) {
    const stockText = product.status === 'out_of_stock' ? 'HABIS' : product.status === 'low_stock' ? `KRITIS (${product.stock} ${product.unit})` : `READY (${product.stock} ${product.unit})`;
    text += `• Qty: ${product.stock} ${product.unit} [${stockText}]\n`;
  }

  if (currentSettings.includeEceran && product.hargaEceran > 0) {
    text += `• Eceran: ${product.formattedEceran}\n`;
  }

  if (currentSettings.includeGrosir && product.hargaGrosir && product.hargaGrosir > 0) {
    text += `• Grosir: ${product.formattedGrosir}\n`;
  }

  if (currentSettings.includePartai && product.hargaPartai && product.hargaPartai > 0) {
    text += `• Partai: ${product.formattedPartai}\n`;
  }

  if (currentSettings.includeHpp && product.hpp && product.hpp > 0) {
    text += `• HPP: ${product.formattedHpp}\n`;
  }

  return text.trim();
}

export function generateProductHtmlSnippet(product: StockProduct, settings?: CopyPriceSettings): string {
  const currentSettings = settings || getStoredCopySettings();
  const badgeColor = product.status === 'out_of_stock' ? '#ef4444' : product.status === 'low_stock' ? '#f59e0b' : '#10b981';
  const badgeText = product.status === 'out_of_stock' ? 'HABIS' : product.status === 'low_stock' ? 'KRITIS' : 'READY';

  let html = `<div style="background:#f8fafc; border:1px solid #e2e8f0; border-left:4px solid ${badgeColor}; padding:10px 14px; border-radius:8px; margin:8px 0; font-family:sans-serif;">`;
  
  if (currentSettings.includeSkuName) {
    html += `<div style="font-weight:bold; color:#0f172a; font-size:13px;">📦 [${product.sku}] ${product.name}</div>`;
  }

  html += `<div style="font-size:11px; color:#334155; margin-top:6px; display:flex; flex-wrap:wrap; gap:10px;">`;
  
  if (currentSettings.includeQty) {
    html += `<span><strong>Qty:</strong> ${product.stock} ${product.unit} <span style="color:${badgeColor}; font-weight:bold;">(${badgeText})</span></span>`;
  }
  if (currentSettings.includeEceran && product.hargaEceran > 0) {
    html += `<span><strong>Eceran:</strong> <span style="color:#0284c7; font-weight:bold;">${product.formattedEceran}</span></span>`;
  }
  if (currentSettings.includeGrosir && product.hargaGrosir && product.hargaGrosir > 0) {
    html += `<span><strong>Grosir:</strong> <span style="color:#059669; font-weight:bold;">${product.formattedGrosir}</span></span>`;
  }
  if (currentSettings.includePartai && product.hargaPartai && product.hargaPartai > 0) {
    html += `<span><strong>Partai:</strong> <span style="color:#7c3aed; font-weight:bold;">${product.formattedPartai}</span></span>`;
  }
  if (currentSettings.includeHpp && product.hpp && product.hpp > 0) {
    html += `<span style="color:#64748b; font-size:10px;">(HPP: ${product.formattedHpp})</span>`;
  }

  html += `</div></div><p></p>`;
  return html;
}
