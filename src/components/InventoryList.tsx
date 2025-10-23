import React, { useEffect, useState } from 'react';
import { Plus, CreditCard as Edit, Trash2, FileText, Package } from 'lucide-react';
import { Inventory } from '../types';
import { inventoryService } from '../services/inventoryService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

interface InventoryListProps {
  onNavigate: (page: string, inventoryId?: string) => void;
}

export default function InventoryList({ onNavigate }: InventoryListProps) {
  const { showToast, showConfirm } = useNotification();
  const { user } = useAuth();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newInventory, setNewInventory] = useState({
    name: '',
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
    if (isCreating) return;

    if (!isSupabaseConfigured) {
      showToast('Supabase nie jest skonfigurowany. Dodaj zmienne VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY do pliku .env', 'error');
      return;
    }

    setIsCreating(true);

    try {
      const inventory = await inventoryService.create({
        ...newInventory,
        type: 'preliminary',
        status: 'active'
      });

      if (inventory) {
        setShowCreateModal(false);
        setNewInventory({ name: '', inventory_method: 'ciągły' });
        await loadInventories();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteInventory = async (id: string, name: string) => {
    if (!isSupabaseConfigured) {
      showToast('Supabase nie jest skonfigurowany.', 'error');
      return;
    }

    if (!user) {
      showToast('Musisz być zalogowany, aby usunąć inwentaryzację.', 'error');
      return;
    }

    const result = await showConfirm({
      title: 'Usuń inwentaryzację',
      message: `Czy na pewno chcesz usunąć inwentaryzację "${name}"?\n\nTo działanie usunie również wszystkie powiązane dane (wpisy wstępne, końcowe, członków komisji) i nie może być cofnięte.`,
      confirmText: 'Usuń',
      type: 'danger',
      requirePassword: true
    });

    if (result && typeof result === 'string') {
      // Weryfikacja hasła użytkownika
      const { data: verifiedUser } = await supabase
        .from('app_users')
        .select('id')
        .eq('login', user.login)
        .eq('password_hash', result)
        .maybeSingle();

      if (!verifiedUser) {
        showToast('Nieprawidłowe hasło. Usuwanie anulowane.', 'error');
        return;
      }

      const success = await inventoryService.delete(id);
      if (success) {
        showToast('Inwentaryzacja została usunięta.', 'success');
        await loadInventories();
      } else {
        showToast('Wystąpił błąd podczas usuwania inwentaryzacji.', 'error');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'completed': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inwentaryzacje</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Nowa inwentaryzacja</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nazwa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Jednostka
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Data utworzenia
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {inventories.map((inventory) => (
                <tr key={inventory.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{inventory.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{inventory.inventory_method}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{inventory.unit_name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{inventory.unit_address}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(inventory.status)}`}>
                      {getStatusText(inventory.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(inventory.created_at).toLocaleDateString('pl-PL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onNavigate('preliminary', inventory.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Inwentaryzacja wstępna"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('final', inventory.id)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-2 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                        title="Inwentaryzacja końcowa"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInventory(inventory.id, inventory.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nazwa inwentaryzacji *
            </label>
            <input
              type="text"
              value={newInventory.name}
              onChange={(e) => setNewInventory({...newInventory, name: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="np. Inwentaryzacja magazynu 2025"
              disabled={isCreating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sposób przeprowadzenia inwentaryzacji *
            </label>
            <select
              value={newInventory.inventory_method}
              onChange={(e) => setNewInventory({...newInventory, inventory_method: e.target.value})}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              disabled={isCreating}
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
              disabled={!newInventory.name || isCreating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Tworzenie...' : 'Utwórz'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}