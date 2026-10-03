export interface StockProduct {
  id: string;
  sku: string;               // Kolom 1
  name: string;              // Kolom 3
  unit: string;              // Kolom 4
  hpp?: number;              // Kolom 8 (HPP)
  formattedHpp?: string;
  hargaEceran: number;       // Kolom 11 (Eceran)
  formattedEceran: string;
  hargaGrosir?: number;      // Kolom 12 (Grosir)
  formattedGrosir?: string;
  hargaPartai?: number;      // Kolom 13 (Partai)
  formattedPartai?: string;
  price: number;             // Primary display price (Eceran)
  formattedPrice: string;
  stock: number;             // Kolom 15 (Qty)
  rawStock: string | number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  category?: string;
  notes?: string;
}

export interface StockSheetConfig {
  spreadsheetId: string;
  sheetName: string;
  autoRefreshMinutes: number;
  lastSyncedAt: number | null;
  columnMapping?: {
    skuCol: number;          // 1 (1-indexed)
    nameCol: number;         // 3
    unitCol: number;         // 4
    hppCol: number;          // 8
    eceranCol: number;       // 11
    grosirCol: number;       // 12
    partaiCol: number;       // 13
    qtyCol: number;          // 15
  };
}

export const DEFAULT_STOCK_CONFIG: StockSheetConfig = {
  spreadsheetId: '1mrD9sQK_Sffa1X1fzlCDmaJXs1Yj2q-XTNdi2sRGPos',
  sheetName: 'STOCK LIST',
  autoRefreshMinutes: 5,
  lastSyncedAt: null,
  columnMapping: {
    skuCol: 1,
    nameCol: 3,
    unitCol: 4,
    hppCol: 8,
    eceranCol: 11,
    grosirCol: 12,
    partaiCol: 13,
    qtyCol: 15,
  }
};
