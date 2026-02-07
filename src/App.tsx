import React, { useState } from 'react';
import Layout from './components/ui/Layout';
import InventoryList from './components/InventoryList';
import ProductManagement from './components/ProductManagement';
import CategoryManagement from './components/CategoryManagement';
import PreliminaryInventory from './components/PreliminaryInventory';
import FinalInventory from './components/FinalInventory';
import UserManagement from './components/UserManagement';
import { Auth } from './components/Auth';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { isSupabaseConfigured } from './lib/supabase';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('inventories');
  const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(null);
  const { user, loading } = useAuth();

  const handleNavigate = (page: string, inventoryId?: string) => {
    setCurrentPage(page);
    if (inventoryId) {
      setCurrentInventoryId(inventoryId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'inventories':
        return <InventoryList onNavigate={handleNavigate} />;
      case 'products':
        return <ProductManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'preliminary':
        return currentInventoryId ? (
          <PreliminaryInventory
            inventoryId={currentInventoryId}
            onNavigate={handleNavigate}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Wybierz inwentaryzację z listy</p>
            <button
              onClick={() => setCurrentPage('inventories')}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Powróć do listy inwentaryzacji
            </button>
          </div>
        );
      case 'final':
        return currentInventoryId ? (
          <FinalInventory
            inventoryId={currentInventoryId}
            onNavigate={handleNavigate}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Wybierz inwentaryzację z listy</p>
            <button
              onClick={() => setCurrentPage('inventories')}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Powróć do listy inwentaryzacji
            </button>
          </div>
        );
      case 'users':
        return <UserManagement />;
      default:
        return <InventoryList onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Konfiguracja Supabase
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-400">
                <p>
                  Aby aplikacja działała poprawnie, skonfiguruj Supabase tworząc plik <code>.env</code> z:
                </p>
                <pre className="mt-2 text-xs bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded">
VITE_SUPABASE_URL=twój_supabase_url{'\n'}
VITE_SUPABASE_ANON_KEY=twój_supabase_anon_key
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
      {renderCurrentPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <NetworkProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </NetworkProvider>
    </ThemeProvider>
  );
}

export default App;