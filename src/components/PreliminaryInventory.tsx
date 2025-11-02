import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Camera, Search, Trash2, CreditCard as Edit, Barcode } from 'lucide-react';
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
      loadEntries();
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

  const loadEntries = async () => {
    if (!selectedCategory) return;
    const data = await entryService.getPreliminaryEntries(inventoryId, selectedCategory);
    setEntries(data);
  };

  const resetEntryForm = () => {
    setNewEntry({
      pku_w: '',
      product_name: '',
      unit: 'szt',
      quantity: 0,
      net_price: 0,
      invoice_number: '',
      barcode: '',
      notes: '',
      category_id: selectedCategory
    });
    setEditingEntry(null);
    setProductSuggestions([]);
    setSuggestionOffset(0);
    setHasMoreSuggestions(true);
  };

  const handleProductNameChange = async (value: string) => {
    setNewEntry({...newEntry, product_name: value});

    if (value.length >= 2) {
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
      const categoryToUse = newEntry.category_id || selectedCategory;
      const suggestions = await productService.search(value, categoryToUse, 50, 0);
      setProductSuggestions(suggestions);
      setHasMoreSuggestions(suggestions.length === 50);
    } else {
      setProductSuggestions([]);
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
    }
  };

  const selectProductSuggestion = (product: Product) => {
    setNewEntry({
      ...newEntry,
      product_name: product.name,
      unit: product.unit,
      net_price: product.net_price || 0,
      barcode: product.barcode || '',
      pku_w: product.pku_w || '',
      category_id: product.category_id || newEntry.category_id
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

  const handleBarcodeOrNameSearch = async (value: string) => {
    if (value.length >= 2) {
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
      const categoryToUse = newEntry.category_id || selectedCategory;
      const suggestions = await productService.search(value, categoryToUse, 50, 0);
      setProductSuggestions(suggestions);
      setHasMoreSuggestions(suggestions.length === 50);
    } else {
      setProductSuggestions([]);
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
    }
  };

  const loadMoreSuggestions = async () => {
    if (!hasMoreSuggestions || loadingMoreSuggestions) return;

    setLoadingMoreSuggestions(true);
    const newOffset = suggestionOffset + 50;
    const categoryToUse = newEntry.category_id || selectedCategory;
    const moreSuggestions = await productService.search(newEntry.product_name, categoryToUse, 50, newOffset);

    setProductSuggestions(prev => [...prev, ...moreSuggestions]);
    setSuggestionOffset(newOffset);
    setHasMoreSuggestions(moreSuggestions.length === 50);
    setLoadingMoreSuggestions(false);
  };

  const handleSuggestionScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

    if (bottom && hasMoreSuggestions && !loadingMoreSuggestions) {
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

  const handleSubmitEntry = async () => {
    if (!newEntry.product_name || !selectedCategory || submitting) return;

    const categoryToUse = newEntry.category_id || selectedCategory;

    if (!categoryToUse) {
      showToast('Kategoria jest wymagana', 'error');
      return;
    }

    setSubmitting(true);

    try {
      let entry;
      if (editingEntry) {
        entry = await entryService.updatePreliminaryEntry(editingEntry.id, {
          ...newEntry,
          category_id: categoryToUse
        });
      } else {
        entry = await entryService.createPreliminaryEntry({
          inventory_id: inventoryId,
          category_id: categoryToUse,
          ...newEntry
        });
      }

      if (!entry) {
        showToast('Nie udało się zapisać wpisu', 'error');
        return;
      }

      await productService.createOrUpdate({
        name: newEntry.product_name,
        barcode: newEntry.barcode || undefined,
        unit: newEntry.unit,
        net_price: newEntry.net_price,
        category_id: categoryToUse,
        pku_w: newEntry.pku_w || undefined,
        invoice_number: newEntry.invoice_number || undefined,
        notes: newEntry.notes || undefined
      });

      showToast('Produkt dodany do inwentaryzacji i zapisany w bazie produktów', 'success');
      setShowAddModal(false);
      resetEntryForm();
      await loadEntries();
    } catch (error) {
      showToast('Wystąpił błąd podczas dodawania produktu', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Usuń wpis',
      message: 'Czy na pewno chcesz usunąć ten wpis?',
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (confirmed) {
      const success = await entryService.deletePreliminaryEntry(id);
      if (success) {
        await loadEntries();
      }
    }
  };

  const handleOCRResult = (result: any) => {
    setNewEntry({
      ...newEntry,
      product_name: result.product_name || '',
      quantity: result.quantity || 0,
      net_price: result.price || 0,
      invoice_number: result.invoice_number || ''
    });
    setShowOCRModal(false);
    setShowAddModal(true);
  };

  const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onNavigate('inventories')}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inwentaryzacja wstępna</h1>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowOCRModal(true)}
            className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors"
          >
            <Camera className="h-4 w-4" />
            <span>OCR</span>
          </button>
          <button
            onClick={() => {
              resetEntryForm();
              setShowAddModal(true);
            }}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj produkt</span>
          </button>
        </div>
      </div>

      {/* Kategorie - lista rozwijana */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Wybierz kategorię:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela wpisów */}
      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Produkty - {categories.find(c => c.id === selectedCategory)?.name}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  PKU i W
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nazwa produktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  J.m.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Ilość
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cena netto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Wartość netto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nr faktury
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{entry.pku_w || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.product_name}</div>
                    {entry.barcode && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                        <Barcode className="h-3 w-3" />
                        <span>{entry.barcode}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {entry.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {entry.quantity.toLocaleString('pl-PL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {entry.net_price.toFixed(2)} zł
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {entry.net_value.toFixed(2)} zł
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {entry.invoice_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Edytuj wpis"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Usuń wpis"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <td colSpan={5} className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                  Suma wartości netto:
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                  {totalValue.toFixed(2)} zł
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak produktów w tej kategorii</h3>
            <p className="mt-1 text-sm text-gray-500">Dodaj pierwszy produkt do rozpoczęcia inwentaryzacji.</p>
          </div>
        )}
      </div>

      {/* Modal dodawania produktu */}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kategoria produktu *
            </label>
            <select
              value={newEntry.category_id || selectedCategory}
              onChange={(e) => setNewEntry({...newEntry, category_id: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Produkt zostanie dodany do widoku "Produkty" w tej kategorii
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PKU i W (opcjonalne)
            </label>
            <input
              type="text"
              value={newEntry.pku_w}
              onChange={(e) => setNewEntry({...newEntry, pku_w: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Kod PKU i W"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nazwa produktu *
            </label>
            <input
              type="text"
              value={newEntry.product_name}
              onChange={(e) => {
                setNewEntry({...newEntry, product_name: e.target.value});
                handleBarcodeOrNameSearch(e.target.value);
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Wpisz nazwę produktu lub kod kreskowy..."
            />
            
            {productSuggestions.length > 0 && (
              <div
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
                onScroll={handleSuggestionScroll}
              >
                {productSuggestions.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => selectProductSuggestion(product)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-gray-500">
                      {product.barcode && `${product.barcode} • `}
                      {product.unit} • {product.net_price?.toFixed(2) || '0.00'} zł
                    </div>
                  </button>
                ))}
                {loadingMoreSuggestions && (
                  <div className="px-3 py-2 text-center text-sm text-gray-500">
                    Ładowanie...
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jednostka miary
              </label>
              <select
                value={newEntry.unit}
                onChange={(e) => setNewEntry({...newEntry, unit: e.target.value})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="szt">szt</option>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
                <option value="ml">ml</option>
                <option value="m">m</option>
                <option value="m2">m²</option>
                <option value="m3">m³</option>
                <option value="opak">opak</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kod kreskowy
              </label>
              <input
                type="text"
                value={newEntry.barcode}
                onChange={(e) => {
                  setNewEntry({...newEntry, barcode: e.target.value});
                  handleBarcodeInput(e.target.value);
                  handleBarcodeOrNameSearch(e.target.value);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="Kod kreskowy produktu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ilość *
              </label>
              <input
                type="number"
                step="0.001"
                value={newEntry.quantity}
                onChange={(e) => setNewEntry({...newEntry, quantity: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cena netto *
              </label>
              <input
                type="number"
                step="0.01"
                value={newEntry.net_price}
                onChange={(e) => setNewEntry({...newEntry, net_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Numer faktury/inwentu
            </label>
            <input
              type="text"
              value={newEntry.invoice_number}
              onChange={(e) => setNewEntry({...newEntry, invoice_number: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="np. FV/2025/001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Uwagi
            </label>
            <textarea
              value={newEntry.notes}
              onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm text-gray-600">
              Wartość netto: <span className="font-medium">{(newEntry.quantity * newEntry.net_price).toFixed(2)} zł</span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetEntryForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleSubmitEntry}
              disabled={!newEntry.product_name || (!newEntry.category_id && !selectedCategory) || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Zapisywanie...' : (editingEntry ? "Zapisz zmiany" : "Dodaj do inwentaryzacji")}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal OCR */}
      <Modal
        isOpen={showOCRModal}
        onClose={() => setShowOCRModal(false)}
        title="Rozpoznaj dane z dokumentu"
        size="md"
      >
        <OCRComponent onResult={handleOCRResult} />
      </Modal>
    </div>
  );
}

// Komponent OCR
function OCRComponent({ onResult }: { onResult: (result: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    const result = await ocrService.processDocument(file);
    setProcessing(false);

    if (result) {
      onResult(result);
    } else {
      showToast('Błąd podczas przetwarzania dokumentu', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wybierz zdjęcie lub PDF
        </label>
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileUpload}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {file && (
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-sm">
            <strong>Wybrany plik:</strong> {file.name}
          </div>
          <div className="text-xs text-gray-500">
            Rozmiar: {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600">
        AI automatycznie wyciągnie dane jak nazwa produktu, ilość, cena i numer faktury. 
        Dane będą wymagały potwierdzenia przed zapisem.
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          onClick={handleProcess}
          disabled={!file || processing}
          className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          <span>{processing ? 'Przetwarzanie...' : 'Przetwórz dokument'}</span>
        </button>
      </div>
    </div>
  );
}