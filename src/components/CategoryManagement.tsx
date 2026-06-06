import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Folder, Search, X, Check } from 'lucide-react';
import { categoryService } from '../services/categoryService';
import { useNotification } from '../contexts/NotificationContext';
import { useNetwork } from '../contexts/NetworkContext';
import ConfirmDialog from './ui/ConfirmDialog';

interface Category {
  id: string;
  name: string;
  created_at?: string;
}

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stan dla nowej kategorii
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Stan dla edycji kategorii
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Stan dla usuwania kategorii
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { showNotification } = useNotification();
  const { isOnline } = useNetwork();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      showNotification('Błąd podczas ładowania kategorii', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (!isOnline) {
      showNotification('Brak połączenia z siecią. Nie można dodać kategorii.', 'error');
      return;
    }

    try {
      const name = newCategoryName.trim();
      const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        showNotification('Kategoria o takiej nazwie już istnieje', 'error');
        return;
      }

      await categoryService.create({ name });
      showNotification('Kategoria została dodana', 'success');
      setNewCategoryName('');
      setIsAdding(false);
      loadCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      showNotification('Błąd podczas tworzenia kategorii', 'error');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    if (!isOnline) {
      showNotification('Brak połączenia z siecią. Nie można edytować kategorii.', 'error');
      return;
    }

    try {
      const name = editingName.trim();
      const existing = categories.find(c => c.name.toLowerCase() === name.toLowerCase() && c.id !== id);
      if (existing) {
        showNotification('Kategoria o takiej nazwie już istnieje', 'error');
        return;
      }

      await categoryService.update(id, { name });
      showNotification('Nazwa kategorii została zaktualizowana', 'success');
      setEditingId(null);
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      showNotification('Błąd podczas aktualizacji kategorii', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;

    if (!isOnline) {
      showNotification('Brak połączenia z siecią. Nie można usunąć kategorii.', 'error');
      return;
    }

    try {
      await categoryService.delete(deletingCategory.id);
      showNotification('Kategoria została usunięta', 'success');
      setDeletingCategory(null);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification('Nie można usunąć kategorii (prawdopodobnie są do niej przypisane produkty)', 'error');
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditingName(category.name);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Główny nagłówek z obsługą trybu ciemnego */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategorie</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Zarządzaj kategoriami produktów w systemie</p>
          </div>
          <div>
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm text-sm font-medium transition-colors"
            >
              {isAdding ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {isAdding ? 'Anuluj' : 'Dodaj kategorię'}
            </button>
          </div>
        </div>

        {/* Formularz dodawania nowej kategorii */}
        {isAdding && (
          <form onSubmit={handleCreate} className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Folder className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Nazwa nowej kategorii (np. AGD, Elektronika)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!newCategoryName.trim()}
                className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Zatwierdź
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Kontener z listą i paskiem wyszukiwania */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-100 dark:border-gray-700 transition-colors">
        {/* Pasek wyszukiwania */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Szukaj kategorii..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 text-sm transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'Brak kategorii pasujących do wyszukiwania.' : 'Brak kategorii w bazie danych.'}
          </div>
        ) : (
          /* Siatka (Grid) z kartami kategorii */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {editingId === category.id ? (
                  /* Tryb Edycji Karty */
                  <div className="space-y-3 w-full">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 transition-colors"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Anuluj"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUpdate(category.id)}
                        disabled={!editingName.trim()}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
                        title="Zapisz"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Tryb Podglądu Karty */
                  <>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md transition-colors">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate" title={category.name}>
                          {category.name}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Przyciski akcji (edytuj / usuń) pojawiające się po najechaniu */}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(category)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Edytuj"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(category)}
                        className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Usuń"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Okno dialogowe potwierdzenia usunięcia */}
      {deletingCategory && (
        <ConfirmDialog
          isOpen={!!deletingCategory}
          title="Usuń kategorię"
          message={`Czy na pewno chcesz usunąć kategorię "${deletingCategory.name}"? Tej operacji nie można cofnąć.`}
          confirmLabel="Usuń"
          cancelLabel="Anuluj"
          onConfirm={handleDelete}
          onCancel={() => setDeletingCategory(null)}
          variant="danger"
        />
      )}
    </div>
  );
}