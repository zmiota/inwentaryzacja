import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Download, RefreshCw, CreditCard as Edit, Trash2, Save, X, Barcode } from 'lucide-react';
import { FinalInventoryEntry, Inventory, Category, Product } from '../types';
import { entryService } from '../services/entryService';
import { categoryService } from '../services/categoryService';
import { productService } from '../services/productService';
import { inventoryService } from '../services/inventoryService';
import { exportService } from '../services/exportService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

interface FinalInventoryProps {
  inventoryId: string;
  onNavigate: (page: string) => void;
}

export default function FinalInventory({ inventoryId, onNavigate }: FinalInventoryProps) {
  const { showConfirm, showToast } = useNotification();
  const [entries, setEntries] = useState<FinalInventoryEntry[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NOWE STANY PAGINACJI
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    pku_w: '', product_name: '', unit: 'szt', quantity: 0, net_price: 0,
    barcode: '', invoice_number: '', notes: '', category_id: ''
  });

  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, [inventoryId]);

  const loadInitialData = async () => {
    setLoading(true);
    const [inv, cats] = await Promise.all([
      inventoryService.getById(inventoryId),
      categoryService.getAll()
    ]);
    setInventory(inv);
    setCategories(cats);
    await updateStats();
    await loadEntries(true);
  };

  const updateStats = async () => {
    const stats = await entryService.getFinalInventoryStats(inventoryId);
    setTotalCount(stats.count);
    setTotalValue(stats.totalValue);
  };

  const loadEntries = async (reset: boolean = false) => {
    if (loadingMore && !reset) return;
    if (!hasMore && !reset) return;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : entries.length;
      const data = await entryService.getFinalEntries(inventoryId, 250, currentOffset);
      
      setHasMore(data.length === 250);

      if (reset) {
        setEntries(data);
      } else {
        setEntries(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newOnes = data.filter(e => !existingIds.has(e.id));
          return [...prev, ...newOnes];
        });
      }
    } catch (error) {
      showToast('Błąd ładowania wpisów', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (!loadingMore && hasMore) {
        loadEntries(false);
      }
    }
  };

  const handleGenerateFromPreliminary = async () => {
    const confirmed = await showConfirm({
      title: 'Zaciągnij dane',
      message: 'To zastąpi obecne dane końcowe danymi ze wstępnej. Kontynuować?',
      confirmText: 'Tak, importuj',
      type: 'warning'
    });
    if (confirmed) {
      const success = await entryService.generateFinalFromPreliminary(inventoryId);
      if (success) {
        await updateStats();
        await loadEntries(true);
      }
    }
  };

  const handleSaveEdit = async (id: string, updates: Partial<FinalInventoryEntry>) => {
    const success = await entryService.updateFinalEntry(id, updates);
    if (success) {
      setEditingEntry(null);
      await updateStats();
      await loadEntries(true);
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.product_name || !newEntry.category_id) return;
    const entry = await entryService.createFinalEntry({
      inventory_id: inventoryId,
      sequence_number: totalCount + 1,
      ...newEntry
    });

    if (entry) {
      await productService.createOrUpdate({
        name: newEntry.product_name, barcode: newEntry.barcode || undefined,
        unit: newEntry.unit, net_price: newEntry.net_price, category_id: newEntry.category_id,
        pku_w: newEntry.pku_w || undefined, invoice_number: newEntry.invoice_number || undefined,
        notes: newEntry.notes || undefined
      });

      showToast('Dodano pomyślnie', 'success');
      setShowAddModal(false);
      setNewEntry({
        pku_w: '', product_name: '', unit: 'szt', quantity: 0,
        net_price: 0, barcode: '', invoice_number: '', notes: '', category_id: ''
      });
      await updateStats();
      await loadEntries(true);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Usuń wpis', message: 'Usunąć ten wpis?', confirmText: 'Usuń', type: 'danger'
    });
    if (confirmed) {
      const success = await entryService.deleteFinalEntry(id);
      if (success) {
        await updateStats();
        await loadEntries(true);
      }
    }
  };

  const handleExportPDF = async () => {
    if (inventory) {
      // Pobieramy wszystko do eksportu (max 10k pozycji)
      const allData = await entryService.getFinalEntries(inventoryId, 10000, 0);
      await exportService.exportToPDF(inventory, allData, []);
    }
  };

  const handleExportExcel = async () => {
    if (inventory) {
      const allData = await entryService.getFinalEntries(inventoryId, 10000, 0);
      await exportService.exportToExcel(inventory, allData);
    }
  };

  const handleProductNameChange = async (value: string) => {
    setNewEntry({...newEntry, product_name: value});
    if (value.length >= 2) {
      const suggestions = await productService.search(value, undefined, 50, 0);
      setProductSuggestions(suggestions);
    } else {
      setProductSuggestions([]);
    }
  };

  if (loading && entries.length === 0) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" text="Ładowanie..." /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => onNavigate('inventories')} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inwentaryzacja końcowa</h1>
            <p className="text-sm text-gray-500">{inventory?.name}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGenerateFromPreliminary} className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
            <RefreshCw className="h-4 w-4" />
            <span>Zaciągnij ze wstępnej</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Dodaj wpis</span>
          </button>
          <button onClick={handleExportPDF} className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
          <button onClick={handleExportExcel} className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Wpisy ({entries.length} z {totalCount})
          </h3>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto" onScroll={handleTableScroll}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Lp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">PKU i W</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nazwa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Kod</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">J.m.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Ilość</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Cena</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Wartość</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <FinalInventoryRow
                  key={entry.id}
                  entry={entry}
                  isEditing={editingEntry === entry.id}
                  onEdit={() => setEditingEntry(entry.id)}
                  onSave={(updates: any) => handleSaveEdit(entry.id, updates)}
                  onCancel={() => setEditingEntry(null)}
                  onDelete={() => handleDeleteEntry(entry.id)}
                />
              ))}
            </tbody>
          </table>
          {loadingMore && <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600 text-right">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            SUMA WARTOŚCI NETTO (cały dokument): {totalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
          </span>
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Dodaj nowy wpis" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kategoria *</label>
            <select
              value={newEntry.category_id}
              onChange={(e) => setNewEntry({...newEntry, category_id: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
            >
              <option value="">Wybierz kategorię...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PKU i W (opcjonalne)</label>
            <input
              type="text"
              value={newEntry.pku_w}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 20) {
                  setNewEntry({...newEntry, pku_w: value});
                }
              }}
              maxLength={20}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              placeholder="Kod PKU i W (maks. 20 znaków)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {newEntry.pku_w.length}/20 znaków
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nazwa produktu *</label>
            <input
              type="text"
              value={newEntry.product_name}
              onChange={(e) => handleProductNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
            />
            {productSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                {productSuggestions.map((p) => (
                  <button key={p.id} onClick={() => {
                    setNewEntry({...newEntry, product_name: p.name, unit: p.unit, net_price: p.net_price || 0, barcode: p.barcode || '', pku_w: p.pku_w || ''});
                    setProductSuggestions([]);
                  }} className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    {p.name} ({p.unit})
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <input type="number" placeholder="Ilość" step="0.001" onChange={(e) => setNewEntry({...newEntry, quantity: parseFloat(e.target.value) || 0})} className="px-3 py-2 border rounded-md" />
            <input type="number" placeholder="Cena netto" step="0.01" onChange={(e) => setNewEntry({...newEntry, net_price: parseFloat(e.target.value) || 0})} className="px-3 py-2 border rounded-md" />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md">Anuluj</button>
            <button onClick={handleAddEntry} disabled={!newEntry.product_name} className="px-4 py-2 bg-blue-600 text-white rounded-md">Dodaj</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function FinalInventoryRow({ entry, isEditing, onEdit, onSave, onCancel, onDelete }: any) {
  const [editData, setEditData] = useState({
    pku_w: entry.pku_w || '', product_name: entry.product_name, unit: entry.unit,
    quantity: entry.quantity, net_price: entry.net_price, barcode: entry.barcode || ''
  });

  if (isEditing) {
    return (
      <tr className="bg-blue-50 dark:bg-blue-900/30">
        <td className="px-6 py-4 text-sm">{entry.sequence_number}</td>
        <td className="px-6 py-4"><input type="text" value={editData.pku_w} onChange={(e) => setEditData({...editData, pku_w: e.target.value})} maxLength={20} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4"><input type="text" value={editData.product_name} onChange={(e) => setEditData({...editData, product_name: e.target.value})} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4"><input type="text" value={editData.barcode} onChange={(e) => setEditData({...editData, barcode: e.target.value})} maxLength={23} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4"><input type="text" value={editData.unit} onChange={(e) => setEditData({...editData, unit: e.target.value})} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4"><input type="number" step="0.001" value={editData.quantity} onChange={(e) => setEditData({...editData, quantity: parseFloat(e.target.value) || 0})} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4"><input type="number" step="0.01" value={editData.net_price} onChange={(e) => setEditData({...editData, net_price: parseFloat(e.target.value) || 0})} className="w-full border rounded text-xs p-1" /></td>
        <td className="px-6 py-4 text-sm">{(editData.quantity * editData.net_price).toFixed(2)} zł</td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end space-x-1">
            <button onClick={() => onSave(editData)} className="text-green-600 p-1"><Save className="h-4 w-4" /></button>
            <button onClick={onCancel} className="text-gray-600 p-1"><X className="h-4 w-4" /></button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{entry.sequence_number}</td>
      <td className="px-6 py-4 text-sm">{entry.pku_w || '-'}</td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium">{entry.product_name}</div>
        {entry.notes && <div className="text-xs text-gray-500">{entry.notes}</div>}
      </td>
      <td className="px-6 py-4 text-sm">{entry.barcode || '-'}</td>
      <td className="px-6 py-4 text-sm">{entry.unit}</td>
      <td className="px-6 py-4 text-sm">{entry.quantity.toLocaleString('pl-PL')}</td>
      <td className="px-6 py-4 text-sm">{entry.net_price.toFixed(2)} zł</td>
      <td className="px-6 py-4 text-sm font-medium">{entry.net_value.toFixed(2)} zł</td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end space-x-1">
          <button onClick={onEdit} className="text-blue-600 p-2 hover:bg-blue-50 rounded-md"><Edit className="h-4 w-4" /></button>
          <button onClick={onDelete} className="text-red-600 p-2 hover:bg-red-50 rounded-md"><Trash2 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
}