import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Camera, Search, Trash2, CreditCard as Edit, Barcode, Package, ListChecks, Calculator } from 'lucide-react';
import { Category, InventoryEntry, Product } from '../types';
import { categoryService } from '../services/categoryService';
import { entryService } from '../services/entryService';
import { productService } from '../services/productService';
import { ocrService } from '../services/ocrService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

interface PreliminaryInventoryProps {
  inventoryId: string;
  onNavigate: (page: string) => void;
}

export default function PreliminaryInventory({ inventoryId, onNavigate }: PreliminaryInventoryProps) {
  const { showToast, showConfirm } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // STATYSTYKI KATEGORII
  const [categoryProductCount, setCategoryProductCount] = useState(0); 
  const [categoryEntriesCount, setCategoryEntriesCount] = useState(0); 
  const [categoryTotalValue, setCategoryTotalValue] = useState(0);     

  const [showAddModal, setShowAddModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [newEntry, setNewEntry] = useState({
    pku_w: '',
    product_name: '',
    unit: 'szt',
    quantity: 0,
    net_price: 0,
    invoice_number: '',
    barcode: '',
    notes: '',
    category_id: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      loadEntries(true);
      updateCategoryStats();
    }
  }, [selectedCategory, inventoryId]);

  const loadCategories = async () => {
    const data = await categoryService.getAll();
    setCategories(data);
    if (data.length > 0) {
      setSelectedCategory(data[0].id);
    }
    setLoading(false);
  };

  const updateCategoryStats = async () => {
    if (!selectedCategory) return;
    const prodCount = await productService.getCount(undefined, selectedCategory);
    setCategoryProductCount(prodCount);
    const stats = await entryService.getCategoryStats(inventoryId, selectedCategory);
    setCategoryEntriesCount(stats.count);
    setCategoryTotalValue(stats.totalValue);
  };

  const loadEntries = async (reset: boolean = false) => {
    if (!selectedCategory || (loadingMore && !reset)) return;
    if (!hasMore && !reset) return;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : entries.length;
      const data = await entryService.getPreliminaryEntries(inventoryId, selectedCategory, 250, currentOffset);
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

  const resetEntryForm = () => {
    setNewEntry({
      pku_w: '', product_name: '', unit: 'szt', quantity: 0, net_price: 0,
      invoice_number: '', barcode: '', notes: '', category_id: selectedCategory
    });
    setEditingEntry(null);
    setProductSuggestions([]);
    setSuggestionOffset(0);
    setHasMoreSuggestions(true);
  };

const handleSubmitEntry = async () => {
    if (!newEntry.product_name || !selectedCategory || submitting) return;
    const categoryToUse = newEntry.category_id || selectedCategory;
    setSubmitting(true);

    try {
      // 1. Zapis do inwentaryzacji wstępnej (inventory_entries)
      const entryData = {
        inventory_id: inventoryId,
        category_id: categoryToUse,
        product_name: newEntry.product_name,
        pku_w: newEntry.pku_w || null,
        unit: newEntry.unit,
        quantity: newEntry.quantity,
        net_price: newEntry.net_price,
        barcode: newEntry.barcode || null,
        invoice_number: newEntry.invoice_number || null,
        notes: newEntry.notes || null
      };

      if (editingEntry) {
        await entryService.updatePreliminaryEntry(editingEntry.id, entryData);
      } else {
        await entryService.createPreliminaryEntry(entryData);
      }

      // 2. Synchronizacja z główną bazą produktów (products)
      try {
        // Upewniamy się, że przesyłamy obiekt o strukturze, której oczekuje productService
        const productData = {
          name: newEntry.product_name, // Sprawdź czy Twój serwis oczekuje 'name' czy 'product_name'
          barcode: newEntry.barcode || undefined,
          unit: newEntry.unit,
          net_price: newEntry.net_price,
          category_id: categoryToUse,
          pku_w: newEntry.pku_w || undefined,
          invoice_number: newEntry.invoice_number || undefined,
          notes: newEntry.notes || undefined
        };

        await productService.createOrUpdate(productData);
      } catch (prodError: any) {
        console.error('Błąd synchronizacji z bazą produktów:', prodError);
        // Jeśli to błąd duplikatu, poinformuj o tym, ale nie blokuj inwentaryzacji
        if (prodError.message?.includes('duplicate')) {
          showToast('Produkt już istnieje w bazie (zaktualizowano dane)', 'info');
        } else {
          showToast('Wpis dodany, ale wystąpił problem z aktualizacją bazy produktów', 'warning');
        }
      }

      showToast('Zapisano pomyślnie', 'success');
      setShowAddModal(false);
      resetEntryForm();
      await loadEntries(true);
      await updateCategoryStats();

    } catch (error: any) {
      console.error('Błąd krytyczny:', error);
      showToast(`Błąd zapisu: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBarcodeOrNameSearch = async (value: string) => {
    if (value.length >= 2) {
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
      const suggestions = await productService.search(value, newEntry.category_id || selectedCategory, 250, 0);
      setProductSuggestions(suggestions);
      setHasMoreSuggestions(suggestions.length === 250); // Poprawione na 250
    } else {
      setProductSuggestions([]);
    }
  };

  const selectProductSuggestion = (product: Product) => {
    setNewEntry({
      ...newEntry, product_name: product.name, unit: product.unit,
      net_price: product.net_price || 0, barcode: product.barcode || '',
      pku_w: product.pku_w || '', category_id: product.category_id || newEntry.category_id
    });
    setProductSuggestions([]);
  };

  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode || barcode.length < 3) return;
    const product = await productService.getByBarcode(barcode);
    if (product) {
      setNewEntry({
        ...newEntry,
        product_name: product.name,
        unit: product.unit,
        net_price: product.net_price || 0,
        barcode: barcode,
        pku_w: product.pku_w || '',
        category_id: product.category_id || newEntry.category_id
      });
    }
  };

  const loadMoreSuggestions = async () => {
    if (!hasMoreSuggestions || loadingMoreSuggestions) return;
    setLoadingMoreSuggestions(true);
    const newOffset = suggestionOffset + 250;
    const moreSuggestions = await productService.search(newEntry.product_name, newEntry.category_id || selectedCategory, 250, newOffset);
    setProductSuggestions(prev => [...prev, ...moreSuggestions]);
    setSuggestionOffset(newOffset);
    setHasMoreSuggestions(moreSuggestions.length === 250);
    setLoadingMoreSuggestions(false);
  };

  const handleSuggestionScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 50) {
      loadMoreSuggestions();
    }
  };

  const handleEditEntry = (entry: InventoryEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      pku_w: entry.pku_w || '',
      product_name: entry.product_name,
      unit: entry.unit,
      quantity: entry.quantity,
      net_price: entry.net_price,
      invoice_number: entry.invoice_number || '',
      barcode: entry.barcode || '',
      notes: entry.notes || '',
      category_id: entry.category_id || selectedCategory
    });
    setShowAddModal(true);
  };

  const handleDeleteEntry = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Usuń wpis', message: 'Czy na pewno chcesz usunąć ten wpis?',
      confirmText: 'Usuń', type: 'danger'
    });
    if (confirmed) {
      const success = await entryService.deletePreliminaryEntry(id);
      if (success) {
        await loadEntries(true);
        await updateCategoryStats(); 
      }
    }
  };

  const handleOCRResult = (result: any) => {
    setNewEntry({
      ...newEntry, product_name: result.product_name || '',
      quantity: result.quantity || 0, net_price: result.price || 0,
      invoice_number: result.invoice_number || ''
    });
    setShowOCRModal(false);
    setShowAddModal(true);
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Ładowanie..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => onNavigate('inventories')} className="p-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inwentaryzacja wstępna</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-800">
                <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                  Produkty w bazie: <span className="font-bold">{categoryProductCount}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md border border-green-100 dark:border-green-800">
                <ListChecks className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  Wpisy: <span className="font-bold">{categoryEntriesCount}</span>
                </span>
              </div>
              <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md border border-amber-100 dark:border-amber-800">
                <Calculator className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Wartość: <span className="font-bold">{categoryTotalValue.toFixed(2)} zł</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-2 h-fit">
          <button onClick={() => setShowOCRModal(true)} className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors">
            <Camera className="h-4 w-4" />
            <span>OCR</span>
          </button>
          <button onClick={() => { resetEntryForm(); setShowAddModal(true); }} className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            <span>Dodaj produkt</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wybierz kategorię:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Widoczne wpisy ({entries.length} z {categoryEntriesCount})
          </h3>
        </div>
        
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto" onScroll={handleTableScroll}>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">PKU i W</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nazwa produktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">J.m.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ilość</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cena netto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Wartość netto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nr faktury</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Akcje</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{entry.pku_w || '-'}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.product_name}</div>
                    {entry.barcode && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                        <Barcode className="h-3 w-3" />
                        <span>{entry.barcode}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{entry.unit}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{entry.quantity.toLocaleString('pl-PL')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{entry.net_price.toFixed(2)} zł</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{entry.net_value.toFixed(2)} zł</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">{entry.invoice_number || '-'}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button onClick={() => handleEditEntry(entry)} className="text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteEntry(entry.id)} className="text-red-600 p-2 rounded-md hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loadingMore && <div className="flex justify-center py-4"><LoadingSpinner size="sm" /></div>}
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600 text-right">
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            Suma wartości netto (cała kategoria): {categoryTotalValue.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
          </span>
        </div>
      </div>

      {/* MODAL DODAWANIA / EDYCJI */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetEntryForm();
        }}
        title={editingEntry ? "Edytuj wpis w inwentaryzacji" : "Dodaj produkt do inwentaryzacji"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategoria produktu *</label>
            <select
              value={newEntry.category_id || selectedCategory}
              onChange={(e) => setNewEntry({...newEntry, category_id: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PKU i W (opcjonalne)</label>
            <input
              type="text"
              value={newEntry.pku_w}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 20) {
                  setNewEntry({...newEntry, pku_w: value});
                } else {
                  showToast('Kod PKU i W może mieć maksymalnie 20 znaków', 'warning');
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

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nazwa produktu *</label>
            <input
              type="text"
              value={newEntry.product_name}
              onChange={(e) => {
                setNewEntry({...newEntry, product_name: e.target.value});
                handleBarcodeOrNameSearch(e.target.value);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              placeholder="Wpisz nazwę produktu..."
            />
            {productSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto" onScroll={handleSuggestionScroll}>
                {productSuggestions.map((product) => (
                  <button key={product.id} onClick={() => selectProductSuggestion(product)} className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.barcode && `${product.barcode} • `}{product.unit} • {product.net_price?.toFixed(2) || '0.00'} zł</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jednostka miary</label>
              <select
                value={newEntry.unit}
                onChange={(e) => setNewEntry({...newEntry, unit: e.target.value})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              >
                {['szt', 'kg', 'g', 'l', 'ml', 'm', 'm2', 'm3', 'opak'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kod kreskowy</label>
              <input
                type="text"
                value={newEntry.barcode}
                onChange={(e) => {
                  setNewEntry({...newEntry, barcode: e.target.value});
                  handleBarcodeInput(e.target.value);
                  handleBarcodeOrNameSearch(e.target.value);
                }}
                maxLength={23}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
                placeholder="Kod kreskowy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ilość *</label>
              <input
                type="number"
                step="0.001"
                value={newEntry.quantity}
                onChange={(e) => setNewEntry({...newEntry, quantity: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cena netto *</label>
              <input
                type="number"
                step="0.01"
                value={newEntry.net_price}
                onChange={(e) => setNewEntry({...newEntry, net_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Numer faktury/inwentu</label>
            <input
              type="text"
              value={newEntry.invoice_number}
              onChange={(e) => setNewEntry({...newEntry, invoice_number: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              placeholder="np. FV/2025/001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Uwagi</label>
            <textarea
              value={newEntry.notes}
              onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-md text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              Wartość netto: <span className="font-medium">{(newEntry.quantity * newEntry.net_price).toFixed(2)} zł</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button onClick={() => { setShowAddModal(false); resetEntryForm(); }} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors">Anuluj</button>
            <button
              onClick={handleSubmitEntry}
              disabled={!newEntry.product_name || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Zapisywanie...' : (editingEntry ? "Zapisz zmiany" : "Dodaj do inwentaryzacji")}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL OCR */}
      <Modal isOpen={showOCRModal} onClose={() => setShowOCRModal(false)} title="Rozpoznaj dane z dokumentu" size="md">
        <OCRComponent onResult={handleOCRResult} />
      </Modal>
    </div>
  );
}

// Komponent OCR (w tym samym pliku na dole)
function OCRComponent({ onResult }: { onResult: (result: any) => void }) {
  const { showToast } = useNotification();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    const result = await ocrService.processDocument(file);
    setProcessing(false);
    if (result) onResult(result);
    else showToast('Błąd podczas przetwarzania dokumentu', 'error');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Wybierz zdjęcie lub PDF</label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          onClick={handleProcess}
          disabled={!file || processing}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {processing ? <LoadingSpinner size="sm" /> : <Camera className="h-4 w-4" />}
          <span>{processing ? 'Przetwarzanie...' : 'Przetwórz dokument'}</span>
        </button>
      </div>
    </div>
  );
}