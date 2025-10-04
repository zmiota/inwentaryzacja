import React, { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, Search, Package, Barcode } from 'lucide-react';
import { Product, Category } from '../types';
import { productService } from '../services/productService';
import { categoryService } from '../services/categoryService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

export default function ProductManagement() {
  const { showConfirm, showToast } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    pku_w: '',
    barcode: '',
    unit: 'szt',
    net_price: 0,
    invoice_number: '',
    notes: '',
    category_id: ''
  });

  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const resetAndLoad = async () => {
      setProducts([]);
      setHasMore(true);
      await loadProducts(true);
    };
    resetAndLoad();
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (categories.length > 0 && !newProduct.category_id && !editingProduct) {
      setNewProduct(prev => ({
        ...prev,
        category_id: categories[0].id
      }));
    }
  }, [categories]);

  const loadData = async () => {
    setLoading(true);
    const categoriesData = await categoryService.getAll();
    setCategories(categoriesData);
    await loadProducts();
    setLoading(false);
    setIsInitialized(true);
  };

  const loadProducts = async (reset: boolean = false) => {
    if (!hasMore && !reset) return;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    const offset = reset ? 0 : products.length;
    const data = await productService.search(searchQuery || '', selectedCategory, 50, offset);

    if (data.length < 50) {
      setHasMore(false);
    }

    if (reset) {
      setProducts(data);
      setLoading(false);
    } else {
      setProducts(prev => [...prev, ...data]);
      setLoadingMore(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.category_id) {
      showToast('Proszę wybrać kategorię', 'error');
      return;
    }
    try {
      const product = await productService.create(newProduct);
      if (product) {
        showToast('Produkt został dodany', 'success');
        setShowAddModal(false);
        resetForm();
        setProducts([]);
        setHasMore(true);
        await loadProducts(true);
      }
    } catch (error: any) {
      if (error.message === 'DUPLICATE_BARCODE') {
        showToast('Produkt z takim kodem kreskowym już istnieje w systemie', 'error');
      } else {
        showToast('Błąd podczas dodawania produktu', 'error');
      }
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    if (!newProduct.category_id) {
      showToast('Proszę wybrać kategorię', 'error');
      return;
    }

    try {
      const updated = await productService.update(editingProduct.id, newProduct);
      if (updated) {
        showToast('Produkt został zaktualizowany', 'success');
        setEditingProduct(null);
        resetForm();
        setShowAddModal(false);
        setProducts([]);
        setHasMore(true);
        await loadProducts(true);
      }
    } catch (error: any) {
      if (error.message === 'DUPLICATE_BARCODE') {
        showToast('Produkt z takim kodem kreskowym już istnieje w systemie', 'error');
      } else {
        showToast('Błąd podczas aktualizacji produktu', 'error');
      }
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    const confirmed = await showConfirm({
      title: 'Usuń produkt',
      message: `Czy na pewno chcesz usunąć produkt "${name}"?`,
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (confirmed) {
      const success = await productService.delete(id);
      if (success) {
        setProducts([]);
        setHasMore(true);
        await loadProducts(true);
      }
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      pku_w: product.pku_w || '',
      barcode: product.barcode || '',
      unit: product.unit,
      net_price: product.net_price || 0,
      invoice_number: product.invoice_number || '',
      notes: product.notes || '',
      category_id: product.category_id || ''
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setNewProduct({
      name: '',
      pku_w: '',
      barcode: '',
      unit: 'szt',
      net_price: 0,
      invoice_number: '',
      notes: '',
      category_id: categories.length > 0 ? categories[0].id : ''
    });
    setEditingProduct(null);
  };

  const filteredProducts = products;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Ładowanie produktów..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Zarządzanie produktami</h1>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Dodaj produkt</span>
        </button>
      </div>

      {/* Filtry */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nazwa produktu:
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Wpisz nazwę..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategoria:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Wszystkie kategorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela produktów */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Produkty ({products.length})
          </h3>
        </div>

        <div
          className="overflow-x-auto max-h-[600px] overflow-y-auto"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
              if (!loadingMore && hasMore) {
                loadProducts(false);
              }
            }
          }}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nazwa produktu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PKU i W
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kod kreskowy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  J.m.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cena netto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.pku_w || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.barcode ? (
                      <div className="flex items-center space-x-1 text-sm text-gray-900">
                        <Barcode className="h-3 w-3" />
                        <span>{product.barcode}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.net_price ? `${product.net_price.toFixed(2)} zł` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors"
                        title="Edytuj produkt"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Usuń produkt"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loadingMore && (
            <div className="flex justify-center items-center py-4">
              <LoadingSpinner size="sm" text="Ładowanie kolejnych produktów..." />
            </div>
          )}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak produktów</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || selectedCategory 
                ? 'Nie znaleziono produktów spełniających kryteria wyszukiwania.'
                : 'Dodaj pierwszy produkt do bazy danych.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Modal dodawania/edycji produktu */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title={editingProduct ? 'Edytuj produkt' : 'Dodaj nowy produkt'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa produktu *
            </label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Wpisz nazwę produktu..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PKU i W (opcjonalne)
            </label>
            <input
              type="text"
              value={newProduct.pku_w}
              onChange={(e) => setNewProduct({...newProduct, pku_w: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Kod PKU i W"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jednostka miary
              </label>
              <select
                value={newProduct.unit}
                onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
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
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kod kreskowy produktu"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategoria *
              </label>
              <select
                value={newProduct.category_id}
                onChange={(e) => setNewProduct({...newProduct, category_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Wybierz kategorię</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cena netto
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.net_price}
                onChange={(e) => setNewProduct({...newProduct, net_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numer faktury/inwentu
            </label>
            <input
              type="text"
              value={newProduct.invoice_number}
              onChange={(e) => setNewProduct({...newProduct, invoice_number: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="np. FV/2025/001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Uwagi
            </label>
            <textarea
              value={newProduct.notes}
              onChange={(e) => setNewProduct({...newProduct, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={editingProduct ? handleUpdateProduct : handleCreateProduct}
              disabled={!newProduct.name || !newProduct.category_id}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {editingProduct ? 'Zapisz zmiany' : 'Dodaj produkt'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}