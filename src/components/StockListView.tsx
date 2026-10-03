import React, { useState, useEffect, useMemo } from 'react';
import { StockProduct, StockSheetConfig, DEFAULT_STOCK_CONFIG } from '../types/stock';
import { 
  fetchStockProductsFromSheet, 
  getStoredStockConfig, 
  saveStoredStockConfig, 
  getCachedStockProducts,
  generateProductSnippet,
  generateProductHtmlSnippet,
  formatRupiah
} from '../services/stockService';
import { 
  Package, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Plus, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  SlidersHorizontal,
  Cloud,
  ChevronRight,
  Database,
  Tag,
  Info
} from 'lucide-react';

interface StockListViewProps {
  onInsertToNote?: (snippetHtml: string, snippetText: string) => void;
  onCreateNoteFromProduct?: (product: StockProduct) => void;
  onShowToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  compact?: boolean;
}

export const StockListView: React.FC<StockListViewProps> = ({
  onInsertToNote,
  onCreateNoteFromProduct,
  onShowToast,
  compact = false,
}) => {
  const [products, setProducts] = useState<StockProduct[]>(() => getCachedStockProducts());
  const [config, setConfig] = useState<StockSheetConfig>(() => getStoredStockConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [copiedPriceKey, setCopiedPriceKey] = useState<string | null>(null);
  const [copiedAllId, setCopiedAllId] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempSpreadsheetId, setTempSpreadsheetId] = useState(config.spreadsheetId);
  const [tempSheetName, setTempSheetName] = useState(config.sheetName);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const loadStockData = async (forceConfig?: StockSheetConfig) => {
    setIsLoading(true);
    setSyncMessage(null);
    try {
      const res = await fetchStockProductsFromSheet(forceConfig || config);
      setProducts(res.products);
      if (res.source === 'google_sheets') {
        onShowToast(`Berhasil memuat ${res.products.length} produk dari Google Sheets! 📊`, 'success');
        setSyncMessage(`🟢 Terhubung langsung: Sheet "${config.sheetName}"`);
      } else {
        if (res.error) {
          setSyncMessage(`ℹ️ ${res.error}`);
        }
      }
    } catch (err: any) {
      onShowToast('Gagal memuat produk: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.unit && p.unit.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [products, search, statusFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const ready = products.filter((p) => p.status === 'in_stock').length;
    const low = products.filter((p) => p.status === 'low_stock').length;
    const out = products.filter((p) => p.status === 'out_of_stock').length;
    return { total, ready, low, out };
  }, [products]);

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    onShowToast(`SKU "${sku}" disalin!`, 'info');
    setTimeout(() => setCopiedSku(null), 1500);
  };

  const handleCopyPrice = (key: string, value: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedPriceKey(key);
    onShowToast(`Harga ${label} (${value}) disalin!`, 'info');
    setTimeout(() => setCopiedPriceKey(null), 1500);
  };

  const handleCopyProductLine = (p: StockProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = generateProductSnippet(p);
    navigator.clipboard.writeText(text);
    setCopiedAllId(p.id);
    onShowToast(`Rincian produk [${p.sku}] disalin!`, 'info');
    setTimeout(() => setCopiedAllId(null), 1500);
  };

  const handleInsert = (p: StockProduct) => {
    if (onInsertToNote) {
      onInsertToNote(generateProductHtmlSnippet(p), generateProductSnippet(p));
      onShowToast(`Produk [${p.sku}] disisipkan ke catatan! ✨`, 'success');
    }
  };

  const handleSaveConfig = () => {
    const newConfig: StockSheetConfig = {
      ...config,
      spreadsheetId: tempSpreadsheetId.trim() || DEFAULT_STOCK_CONFIG.spreadsheetId,
      sheetName: tempSheetName.trim() || DEFAULT_STOCK_CONFIG.sheetName,
    };
    saveStoredStockConfig(newConfig);
    setConfig(newConfig);
    setShowConfigModal(false);
    onShowToast('Konfigurasi Google Sheet berhasil diperbarui!', 'success');
    loadStockData(newConfig);
  };

  const googleSheetUrl = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`;

  return (
    <div className={`flex flex-col h-full bg-slate-50 text-slate-800 ${compact ? 'text-xs' : 'text-sm'}`}>
      {/* Top Header Card */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-col gap-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 leading-tight">
                <span>Daftar Stok Produk</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {config.sheetName}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Sheet ID: <code className="font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded">{config.spreadsheetId.substring(0, 14)}...</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => loadStockData()}
              disabled={isLoading}
              className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200"
              title="Perbarui data dari Google Sheets (STOCK LIST)"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200"
              title="Buka Spreadsheet di Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => {
                setTempSpreadsheetId(config.spreadsheetId);
                setTempSheetName(config.sheetName);
                setShowConfigModal(true);
              }}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Pengaturan Google Sheet"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sync message if any */}
        {syncMessage && (
          <div className="text-[10px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center justify-between">
            <span className="truncate">{syncMessage}</span>
            <span className="text-slate-400 text-[9px] whitespace-nowrap ml-2">Total: {products.length} item</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari SKU (kolom 1), Nama Produk (kolom 3), atau Satuan..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white text-slate-800 placeholder:text-slate-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('in_stock')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'in_stock'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🟢 Ready ({stats.ready})
          </button>
          <button
            onClick={() => setStatusFilter('low_stock')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'low_stock'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            ⚠️ Kritis ({stats.low})
          </button>
          <button
            onClick={() => setStatusFilter('out_of_stock')}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              statusFilter === 'out_of_stock'
                ? 'bg-rose-600 text-white font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            🔴 Habis ({stats.out})
          </button>
        </div>
      </div>

      {/* Product List Content */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-200 my-4">
            <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700 text-xs">Tidak ada produk ditemukan</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Coba gunakan kata kunci SKU atau nama produk lainnya
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const isOut = product.status === 'out_of_stock';
            const isLow = product.status === 'low_stock';

            return (
              <div
                key={product.id}
                className="bg-white p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col gap-2.5 group"
              >
                {/* Header: SKU (Kol 1), Unit (Kol 4), Qty (Kol 15) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* SKU Pill (Kolom 1) */}
                    <button
                      onClick={(e) => handleCopySku(product.sku, e)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono text-[10.5px] font-bold rounded-md border border-slate-200 flex items-center gap-1 transition-colors"
                      title="Klik untuk salin SKU (Kolom 1)"
                    >
                      <Tag className="w-2.5 h-2.5 text-slate-500" />
                      <span>{product.sku}</span>
                      {copiedSku === product.sku ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-400" />
                      )}
                    </button>

                    {/* Unit Pill (Kolom 4) */}
                    <span className="text-[9.5px] text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                      Satuan: <strong>{product.unit || 'pcs'}</strong>
                    </span>
                  </div>

                  {/* Stock / Qty Badge (Kolom 15) */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isOut
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : isLow
                        ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isOut ? (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Qty: 0 (Habis)</span>
                      </>
                    ) : isLow ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>Qty: {product.stock} {product.unit || 'pcs'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Qty: {product.stock} {product.unit || 'pcs'}</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Nama Produk (Kolom 3) */}
                <div className="font-bold text-slate-900 text-xs leading-snug">
                  {product.name}
                </div>

                {/* Price Tiers Grid (Eceran: 11, Grosir: 12, Partai: 13, HPP: 8) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 bg-slate-50/80 rounded-lg border border-slate-200/80">
                  {/* Eceran (Kolom 11) */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyPrice(`eceran_${product.id}`, product.formattedEceran, 'Eceran', e)}
                    className="flex flex-col text-left p-1.5 rounded bg-white border border-slate-200 hover:border-sky-300 transition-colors group/btn"
                    title="Klik untuk salin Harga Eceran (Kolom 11)"
                  >
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Eceran (11)</span>
                      {copiedPriceKey === `eceran_${product.id}` ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-300 group-hover/btn:text-sky-600" />
                      )}
                    </span>
                    <span className="font-bold text-sky-700 text-[11px]">
                      {product.formattedEceran}
                    </span>
                  </button>

                  {/* Grosir (Kolom 12) */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyPrice(`grosir_${product.id}`, product.formattedGrosir || 'Rp 0', 'Grosir', e)}
                    className="flex flex-col text-left p-1.5 rounded bg-white border border-slate-200 hover:border-emerald-300 transition-colors group/btn"
                    title="Klik untuk salin Harga Grosir (Kolom 12)"
                  >
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Grosir (12)</span>
                      {copiedPriceKey === `grosir_${product.id}` ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-300 group-hover/btn:text-emerald-600" />
                      )}
                    </span>
                    <span className="font-bold text-emerald-700 text-[11px]">
                      {product.formattedGrosir || '-'}
                    </span>
                  </button>

                  {/* Partai (Kolom 13) */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyPrice(`partai_${product.id}`, product.formattedPartai || 'Rp 0', 'Partai', e)}
                    className="flex flex-col text-left p-1.5 rounded bg-white border border-slate-200 hover:border-purple-300 transition-colors group/btn"
                    title="Klik untuk salin Harga Partai (Kolom 13)"
                  >
                    <span className="text-[9px] text-slate-500 font-semibold flex items-center justify-between">
                      <span>Partai (13)</span>
                      {copiedPriceKey === `partai_${product.id}` ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-300 group-hover/btn:text-purple-600" />
                      )}
                    </span>
                    <span className="font-bold text-purple-700 text-[11px]">
                      {product.formattedPartai || '-'}
                    </span>
                  </button>

                  {/* HPP (Kolom 8) */}
                  <button
                    type="button"
                    onClick={(e) => handleCopyPrice(`hpp_${product.id}`, product.formattedHpp || 'Rp 0', 'HPP', e)}
                    className="flex flex-col text-left p-1.5 rounded bg-white border border-slate-200 hover:border-slate-400 transition-colors group/btn"
                    title="Klik untuk salin HPP (Kolom 8)"
                  >
                    <span className="text-[9px] text-slate-400 font-semibold flex items-center justify-between">
                      <span>HPP (8)</span>
                      {copiedPriceKey === `hpp_${product.id}` ? (
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-slate-300 group-hover/btn:text-slate-600" />
                      )}
                    </span>
                    <span className="font-semibold text-slate-600 text-[11px]">
                      {product.formattedHpp || '-'}
                    </span>
                  </button>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[9.5px] text-slate-400">
                    Klik harga di atas untuk salin cepat
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleCopyProductLine(product, e)}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-200 transition-colors flex items-center gap-1"
                      title="Salin ringkasan lengkap info produk"
                    >
                      {copiedAllId === product.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Salin Lengkap</span>
                        </>
                      )}
                    </button>

                    {onInsertToNote && (
                      <button
                        onClick={() => handleInsert(product)}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                        title="Sisipkan ke editor catatan aktif"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Sisip ke Memo</span>
                      </button>
                    )}

                    {onCreateNoteFromProduct && (
                      <button
                        onClick={() => onCreateNoteFromProduct(product)}
                        className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors border border-slate-200"
                        title="Buat Catatan Memo Khusus untuk Produk ini"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-slate-200 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pengaturan Google Sheet "STOCK LIST"</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Spreadsheet ID:
                </label>
                <input
                  type="text"
                  value={tempSpreadsheetId}
                  onChange={(e) => setTempSpreadsheetId(e.target.value)}
                  placeholder="1mrD9sQK_Sffa1X1fzlCDmaJXs1Yj2q-XTNdi2sRGPos"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-[11px] focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Tab/Sheet:
                </label>
                <input
                  type="text"
                  value={tempSheetName}
                  onChange={(e) => setTempSheetName(e.target.value)}
                  placeholder="STOCK LIST"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Column Mapping Reference Guide */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
                <p className="font-bold text-slate-800 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Struktur Kolom Sesuai Format:</span>
                </p>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 pt-1">
                  <div>• Kolom 1 (A): <strong>SKU</strong></div>
                  <div>• Kolom 3 (C): <strong>Nama Produk</strong></div>
                  <div>• Kolom 4 (D): <strong>Unit (Satuan)</strong></div>
                  <div>• Kolom 8 (H): <strong>HPP</strong></div>
                  <div>• Kolom 11 (K): <strong>Harga Eceran</strong></div>
                  <div>• Kolom 12 (L): <strong>Harga Grosir</strong></div>
                  <div>• Kolom 13 (M): <strong>Harga Partai</strong></div>
                  <div>• Kolom 15 (O): <strong>Qty (Stok)</strong></div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setTempSpreadsheetId(DEFAULT_STOCK_CONFIG.spreadsheetId);
                  setTempSheetName(DEFAULT_STOCK_CONFIG.sheetName);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Reset Default
              </button>
              <button
                onClick={handleSaveConfig}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                Simpan & Muat Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
