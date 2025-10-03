import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FileText, Package } from 'lucide-react';
import { Inventory } from '../types';
import { inventoryService } from '../services/inventoryService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { isSupabaseConfigured } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';

interface InventoryListProps {
  onNavigate: (page: string, inventoryId?: string) => void;
}

export default function InventoryList({ onNavigate }: InventoryListProps) {
  const { showToast, showConfirm } = useNotification();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newInventory, setNewInventory] = useState({
    name: '',
    unit_name: '',
    unit_address: '',
    inventory_method: 'ciągły'
  });

  useEffect(() => {
    loadInventories();
  }, []);

  const loadInventories = async () => {
    setLoading(true);
    const data = isSupabaseConfigured ? await inventoryService.getAll() : [];
    setInventories(data);
    setLoading(false);
  };

  const handleCreateInventory = async () => {
    if (!isSupabaseConfigured) {
      showToast('Supabase nie jest skonfigurowany. Dodaj zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY do pliku .env', 'error');
      return;
    }
    
    const inventory = await inventoryService.create({
      ...newInventory,
      type: 'preliminary',
      status: 'active'
    });
    
    if (inventory) {
      setShowCreateModal(false);
      setNewInventory({ name: '', unit_name: '', unit_address: '', inventory_method: 'ciągły' });
      await loadInventories();
    }
  };

  const handleDeleteInventory = async (id: string, name: string) => {
    if (!isSupabaseConfigured) {
      showToast('Supabase nie jest skonfigurowany.', 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: 'Usuń inwentaryzację',
      message: `Czy na pewno chcesz usunąć inwentaryzację "${name}"?\n\nTo działanie usunie również wszystkie powiązane dane (wpisy wstępne, końcowe, członków komisji) i nie może być cofnięte.`,
      confirmText: 'Usuń',
      type: 'danger'
    });
    if (confirmed) {
      const success = await inventoryService.delete(id);
      if (success) {
        await loadInventories();
      } else {
        showToast('Wystąpił błąd podczas usuwania inwentaryzacji.', 'error');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktywna';
      case 'completed': return 'Zakończona';
      case 'draft': return 'Szkic';
      default: return 'Nieznany';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" text="Ładowanie inwentaryzacji..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inwentaryzacje</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nowa inwentaryzacja</span>
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nazwa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jednostka
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data utworzenia
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventories.map((inventory) => (
                <tr key={inventory.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{inventory.name}</div>
                    <div className="text-sm text-gray-500">{inventory.inventory_method}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{inventory.unit_name}</div>
                    <div className="text-sm text-gray-500">{inventory.unit_address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inventory.status)}`}>
                      {getStatusText(inventory.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(inventory.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onNavigate('preliminary', inventory.id)}
                        className="text-blue-600 hover:text-blue-900 p-2 rounded-md hover:bg-blue-50 transition-colors"
                        title="Inwentaryzacja wstępna"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('final', inventory.id)}
                        className="text-green-600 hover:text-green-900 p-2 rounded-md hover:bg-green-50 transition-colors"
                        title="Inwentaryzacja końcowa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInventory(inventory.id, inventory.name)}
                        className="text-red-600 hover:text-red-900 p-2 rounded-md hover:bg-red-50 transition-colors"
                        title="Usuń inwentaryzację"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {inventories.length === 0 && (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Brak inwentaryzacji</h3>
            <p className="mt-1 text-sm text-gray-500">Rozpocznij od utworzenia nowej inwentaryzacji.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Utwórz inwentaryzację</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nowa inwentaryzacja"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa inwentaryzacji *
            </label>
            <input
              type="text"
              value={newInventory.name}
              onChange={(e) => setNewInventory({...newInventory, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="np. Inwentaryzacja magazynu 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa jednostki inwentaryzacyjnej
            </label>
            <input
              type="text"
              value={newInventory.unit_name}
              onChange={(e) => setNewInventory({...newInventory, unit_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nazwa firmy/jednostki"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adres jednostki
            </label>
            <textarea
              value={newInventory.unit_address}
              onChange={(e) => setNewInventory({...newInventory, unit_address: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Pełny adres jednostki"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sposób przeprowadzenia inwentaryzacji
            </label>
            <select
              value={newInventory.inventory_method}
              onChange={(e) => setNewInventory({...newInventory, inventory_method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="ciągły">Ciągły</option>
              <option value="okresowy">Okresowy</option>
              <option value="doraźny">Doraźny</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Anuluj
            </button>
            <button
              onClick={handleCreateInventory}
              disabled={!newInventory.name}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Utwórz
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}