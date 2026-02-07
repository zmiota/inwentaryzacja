import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Tag, Search } from 'lucide-react';
import { Category } from '../types';
import { categoryService } from '../services/categoryService';
import LoadingSpinner from './ui/LoadingSpinner';
import Modal from './ui/Modal';
import { useNotification } from '../contexts/NotificationContext';

export default function CategoryManagement() {
  const { showConfirm, showToast } = useNotification();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const data = await categoryService.getAll();
    setCategories(data);
    setLoading(false);
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Nazwa kategorii jest wymagana', 'error');
      return;
    }

    try {
      if (editingCategory) {
        const updated = await categoryService.update(
          editingCategory.id,
          formData.name.trim(),
          formData.description.trim()
        );
        if (updated) {
          setCategories(categories.map(c =>
            c.id === editingCategory.id ? updated : c
          ));
          showToast('Kategoria została zaktualizowana', 'success');
        } else {
          showToast('Błąd podczas aktualizacji kategorii', 'error');
        }
      } else {
        const created = await categoryService.create(
          formData.name.trim(),
          formData.description.trim()
        );
        if (created) {
          setCategories([...categories, created]);
          showToast('Kategoria została utworzona', 'success');
        } else {
          showToast('Błąd podczas tworzenia kategorii', 'error');
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error('Błąd:', error);
      showToast('Wystąpił nieoczekiwany błąd', 'error');
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = await showConfirm(
      'Czy na pewno chcesz usunąć tę kategorię?',
      'Tej operacji nie można cofnąć. Produkty z tą kategorią stracą przypisanie.'
    );

    if (confirmed) {
      const success = await categoryService.delete(category.id);
      if (success) {
        setCategories(categories.filter(c => c.id !== category.id));
        showToast('Kategoria została usunięta', 'success');
      } else {
        showToast('Błąd podczas usuwania kategorii', 'error');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Tag className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Kategorie</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Zarządzaj kategoriami produktów
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Dodaj kategorię
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Szukaj kategorii..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="p-6">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'Nie znaleziono kategorii' : 'Brak kategorii'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenModal(category)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Usuń
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingCategory ? 'Edytuj kategorię' : 'Dodaj kategorię'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nazwa kategorii <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="np. Elektronika, Meble, Biuro"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Opcjonalny opis kategorii..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingCategory ? 'Zapisz zmiany' : 'Dodaj kategorię'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
