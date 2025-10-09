import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Camera, Search, Trash2, CreditCard as Edit, Barcode } from 'lucide-react';
import { Category, InventoryEntry, Product } from '../types';
import { categoryService } from '../services/categoryService';
import { entryService } from '../services/entryService';
import { productService } from '../services/productService';
import { ocrService } from '../services/ocrService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';

interface PreliminaryInventoryProps {
  inventoryId: string;
  onNavigate: (page: string) => void;
}

export default function PreliminaryInventory({ inventoryId, onNavigate }: PreliminaryInventoryProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOCRModal, setShowOCRModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
  const [newEntry, setNewEntry] = useState({
    pku_w: '',
    product_name: '',
    unit: 'szt',
    quantity: 0,
    net_price: 0,
    invoice_number: '',
    barcode: '',
    notes: ''
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

  const handleProductNameChange = async (value: string) => {
    setNewEntry({...newEntry, product_name: value});
    
    if (value.length >= 2) {
      const suggestions = await productService.search(value, selectedCategory);
      setProductSuggestions(suggestions);
    } else {
      setProductSuggestions([]);
    }
  };

  const selectProductSuggestion = (product: Product) => {
    setNewEntry({
      ...newEntry,
      pku_w: product.pku_w || '',
      product_name: product.name,
      unit: product.unit,
      net_price: product.net_price || 0,
      barcode: product.barcode || ''
    });
    setProductSuggestions([]);
  };

  const handleBarcodeInput = async (barcode: string) => {
    if (!barcode) return;

    const product = await productService.getByBarcode(barcode);
    if (product) {
      setNewEntry({
        ...newEntry,
        pku_w: product.pku_w || '',
        product_name: product.name,
        unit: product.unit,
        net_price: product.net_price || 0,
        barcode: barcode
      });
    }
  };

  const handleBarcodeOrNameSearch = async (value: string) => {
    if (value.length >= 2) {
      const suggestions = await productService.search(value);
      setProductSuggestions(suggestions);
    } else {
      setProductSuggestions([]);
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
      notes: entry.notes || ''
    });
    setShowAddModal(true);
  };

  const handleSubmitEntry = async () => {
    if (!newEntry.product_name || !selectedCategory) return;

    let entry;
    if (editingEntry) {
      // Aktualizuj istniejący wpis
      entry = await entryService.updatePreliminaryEntry(editingEntry.id, newEntry);
    } else {
      // Utwórz nowy wpis
      entry = await entryService.createPreliminaryEntry({
        inventory_id: inventoryId,
        category_id: selectedCategory,
        ...newEntry
      });
    }

    if (entry) {
      // Sprawdź czy produkt istnieje, jeśli nie - utwórz
      if (newEntry.product_name) {
        let shouldCreateProduct = false;

        if (newEntry.barcode) {
          const existingProduct = await productService.getByBarcode(newEntry.barcode);
          if (!existingProduct) {
            shouldCreateProduct = true;
          }
        } else {
          shouldCreateProduct = true;
        }

        if (shouldCreateProduct) {
          await productService.create({
            name: newEntry.product_name,
            barcode: newEntry.barcode || undefined,
            pku_w: newEntry.pku_w || undefined,
            unit: newEntry.unit,
            net_price: newEntry.net_price,
            category_id: selectedCategory
          });
        }
      }

      setShowAddModal(false);
      setEditingEntry(null);
      setNewEntry({
        pku_w: '',
        product_name: '',
        unit: 'szt',
        quantity: 0,
        net_price: 0,
        invoice_number: '',
        barcode: '',
        notes: ''
      });
      await loadEntries();
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten wpis?')) {
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
          <h1 className="text-2xl font-bold text-gray-900">Inwentaryzacja wstępna</h1>
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
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Dodaj produkt</span>
          </button>
        </div>
      </div>

      {/* Kategorie - lista rozwijana */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wybierz kategorię:
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela wpisów */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Produkty - {categories.find(c => c.id === selectedCategory)?.name}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PKU i W
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nazwa produktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  J.m.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ilość
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cena netto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wartość netto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nr faktury
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{entry.pku_w || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{entry.product_name}</div>
                    {entry.barcode && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Barcode className="h-3 w-3" />
                        <span>{entry.barcode}</span>
                      </div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {entry.invoice_number || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-1">
                      <button
                        onClick={() => handleEditEntry(entry)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edytuj wpis"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Usuń wpis"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                  Suma wartości netto:
                </td>
                <td className="px-6 py-3 text-sm font-bold text-gray-900">
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
        onClose={() => setShowAddModal(false)}
        title={editingEntry ? "Edytuj wpis w inwentaryzacji" : "Dodaj produkt do inwentaryzacji"}
        size="lg"
      >
        <div className="space-y-4">
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
              onChange={(e) => {
                setNewEntry({...newEntry, product_name: e.target.value});
                handleBarcodeOrNameSearch(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Wpisz nazwę produktu lub kod kreskowy..."
            />
            
            {productSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
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
                onChange={(e) => {
                  setNewEntry({...newEntry, barcode: e.target.value});
                  handleBarcodeInput(e.target.value);
                  handleBarcodeOrNameSearch(e.target.value);
                }}
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
              onClick={handleSubmitEntry}
              disabled={!newEntry.product_name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingEntry ? "Zapisz zmiany" : "Dodaj do inwentaryzacji"}
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
      alert('Błąd podczas przetwarzania dokumentu');
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