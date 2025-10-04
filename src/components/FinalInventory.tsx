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
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    pku_w: '',
    product_name: '',
    unit: 'szt',
    quantity: 0,
    net_price: 0,
    barcode: '',
    invoice_number: '',
    notes: '',
    category_id: ''
  });
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [suggestionOffset, setSuggestionOffset] = useState(0);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(true);
  const [loadingMoreSuggestions, setLoadingMoreSuggestions] = useState(false);

  useEffect(() => {
    loadData();
  }, [inventoryId]);

  const loadData = async () => {
    setLoading(true);
    const [entriesData, inventoryData, categoriesData] = await Promise.all([
      entryService.getFinalEntries(inventoryId),
      inventoryService.getById(inventoryId),
      categoryService.getAll()
    ]);
    setEntries(entriesData);
    setInventory(inventoryData);
    setCategories(categoriesData);
    setLoading(false);
  };

  const handleGenerateFromPreliminary = async () => {
    const confirmed = await showConfirm({
      title: 'Zaciągnij dane z inwentaryzacji wstępnej',
      message: 'To zaimportuje wszystkie dane z inwentaryzacji wstępnej i zastąpi obecne dane końcowe. Kontynuować?',
      confirmText: 'Tak, zaimportuj',
      type: 'warning'
    });
    if (confirmed) {
      const success = await entryService.generateFinalFromPreliminary(inventoryId);
      if (success) {
        await loadData();
      }
    }
  };

  const handleSaveEdit = async (id: string, updates: Partial<FinalInventoryEntry>) => {
    const success = await entryService.updateFinalEntry(id, updates);
    if (success) {
      setEditingEntry(null);
      await loadData();
    }
  };

  const handleAddEntry = async () => {
    if (!newEntry.product_name || !newEntry.category_id) return;

    const maxSequenceNumber = Math.max(...entries.map(e => e.sequence_number), 0);

    const entry = await entryService.createFinalEntry({
      inventory_id: inventoryId,
      sequence_number: maxSequenceNumber + 1,
      ...newEntry
    });

    if (entry) {
      await productService.createOrUpdate({
        name: newEntry.product_name,
        barcode: newEntry.barcode || undefined,
        unit: newEntry.unit,
        net_price: newEntry.net_price,
        category_id: newEntry.category_id,
        pku_w: newEntry.pku_w || undefined,
        invoice_number: newEntry.invoice_number || undefined,
        notes: newEntry.notes || undefined
      });

      showToast('Produkt dodany do inwentaryzacji i zapisany w bazie produktów', 'success');
      setShowAddModal(false);
      setNewEntry({
        pku_w: '',
        product_name: '',
        unit: 'szt',
        quantity: 0,
        net_price: 0,
        barcode: '',
        invoice_number: '',
        notes: '',
        category_id: ''
      });
      setProductSuggestions([]);
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
      await loadData();
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
      const success = await entryService.deleteFinalEntry(id);
      if (success) {
        await loadData();
      }
    }
  };

  const handleExportPDF = async () => {
    if (inventory) {
      await exportService.exportToPDF(inventory, entries, []);
    }
  };

  const handleExportExcel = async () => {
    if (inventory) {
      await exportService.exportToExcel(inventory, entries);
    }
  };

  const handleProductNameChange = async (value: string) => {
    setNewEntry({...newEntry, product_name: value});

    if (value.length >= 2) {
      setSuggestionOffset(0);
      setHasMoreSuggestions(true);
      const suggestions = await productService.search(value, undefined, 50, 0);
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

  const loadMoreSuggestions = async () => {
    if (!hasMoreSuggestions || loadingMoreSuggestions) return;

    setLoadingMoreSuggestions(true);
    const newOffset = suggestionOffset + 50;
    const moreSuggestions = await productService.search(newEntry.product_name, undefined, 50, newOffset);

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

  const totalValue = entries.reduce((sum, entry) => sum + entry.net_value, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Ładowanie inwentaryzacji końcowej..." />
      </div>
    );
  }

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inwentaryzacja końcowa</h1>
            {inventory && (
              <p className="text-sm text-gray-500">{inventory.name}</p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleGenerateFromPreliminary}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Zaciągnij ze wstępnej</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj wpis</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tabela inwentaryzacji końcowej</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  Lp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  PKU i W
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nazwa produktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Kod kreskowy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  J.m.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Ilość
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Cena netto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Wartość netto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <FinalInventoryRow
                  key={entry.id}
                  entry={entry}
                  isEditing={editingEntry === entry.id}
                  onEdit={() => setEditingEntry(entry.id)}
                  onSave={(updates) => handleSaveEdit(entry.id, updates)}
                  onCancel={() => setEditingEntry(null)}
                  onDelete={() => handleDeleteEntry(entry.id)}
                />
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={7} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                  SUMA WARTOŚCI NETTO:
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-900">
                  {totalValue.toFixed(2)} zł
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <RefreshCw className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak wpisów w inwentaryzacji końcowej</h3>
            <p className="mt-1 text-sm text-gray-500">
              Zaciągnij dane z inwentaryzacji wstępnej lub dodaj wpisy ręcznie.
            </p>
          </div>
        )}
      </div>

      {/* Modal dodawania wpisu */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Dodaj nowy wpis"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategoria produktu *
            </label>
            <select
              value={newEntry.category_id}
              onChange={(e) => setNewEntry({...newEntry, category_id: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Wybierz kategorię...</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PKU i W (opcjonalne)
            </label>
            <input
              type="text"
              value={newEntry.pku_w}
              onChange={(e) => setNewEntry({...newEntry, pku_w: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kod PKU i W"
            />
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa produktu *
            </label>
            <input
              type="text"
              value={newEntry.product_name}
              onChange={(e) => handleProductNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Wpisz nazwę produktu..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jednostka miary
              </label>
              <select
                value={newEntry.unit}
                onChange={(e) => setNewEntry({...newEntry, unit: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kod kreskowy
              </label>
              <input
                type="text"
                value={newEntry.barcode}
                onChange={(e) => setNewEntry({...newEntry, barcode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kod kreskowy produktu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ilość *
              </label>
              <input
                type="number"
                step="0.001"
                value={newEntry.quantity}
                onChange={(e) => setNewEntry({...newEntry, quantity: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cena netto *
              </label>
              <input
                type="number"
                step="0.01"
                value={newEntry.net_price}
                onChange={(e) => setNewEntry({...newEntry, net_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer faktury/inwentu
            </label>
            <input
              type="text"
              value={newEntry.invoice_number}
              onChange={(e) => setNewEntry({...newEntry, invoice_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="np. FV/2025/001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uwagi
            </label>
            <textarea
              value={newEntry.notes}
              onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleAddEntry}
              disabled={!newEntry.product_name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Dodaj wpis
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Komponent wiersza tabeli z możliwością edycji
function FinalInventoryRow({ 
  entry, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete 
}: {
  entry: FinalInventoryEntry;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<FinalInventoryEntry>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [editData, setEditData] = useState({
    pku_w: entry.pku_w || '',
    product_name: entry.product_name,
    unit: entry.unit,
    quantity: entry.quantity,
    net_price: entry.net_price,
    barcode: entry.barcode || '',
    invoice_number: entry.invoice_number || '',
    notes: entry.notes || ''
  });

  if (isEditing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {entry.sequence_number}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="text"
            value={editData.pku_w}
            onChange={(e) => setEditData({...editData, pku_w: e.target.value})}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={editData.product_name}
            onChange={(e) => setEditData({...editData, product_name: e.target.value})}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <select
            value={editData.unit}
            onChange={(e) => setEditData({...editData, unit: e.target.value})}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
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
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="number"
            step="0.001"
            value={editData.quantity}
            onChange={(e) => setEditData({...editData, quantity: parseFloat(e.target.value) || 0})}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <input
            type="number"
            step="0.01"
            value={editData.net_price}
            onChange={(e) => setEditData({...editData, net_price: parseFloat(e.target.value) || 0})}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
          />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {(editData.quantity * editData.net_price).toFixed(2)} zł
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end space-x-1">
            <button
              onClick={() => onSave(editData)}
              className="text-green-600 hover:text-green-900 p-1 rounded transition-colors"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="text-gray-600 hover:text-gray-900 p-1 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {entry.row_number}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {entry.pku_w || '-'}
      </td>
      <td className="px-6 py-4">
        <div className="text-sm font-medium text-gray-900">{entry.product_name}</div>
        {entry.notes && (
          <div className="text-xs text-gray-500 mt-1">{entry.notes}</div>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {entry.barcode ? (
          <div className="flex items-center space-x-1 text-sm text-gray-900">
            <Barcode className="h-3 w-3" />
            <span>{entry.barcode}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {entry.unit}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {entry.quantity.toLocaleString('pl-PL')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {entry.net_price.toFixed(2)} zł
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {entry.net_value.toFixed(2)} zł
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-1">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}