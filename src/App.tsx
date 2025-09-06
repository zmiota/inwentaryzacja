import React, { useState } from 'react';
import Layout from './components/ui/Layout';
import InventoryList from './components/InventoryList';
import PreliminaryInventory from './components/PreliminaryInventory';
import FinalInventory from './components/FinalInventory';

function App() {
  const [currentPage, setCurrentPage] = useState('inventories');
  const [currentInventoryId, setCurrentInventoryId] = useState<string | null>(null);

  const handleNavigate = (page: string, inventoryId?: string) => {
    setCurrentPage(page);
    if (inventoryId) {
      setCurrentInventoryId(inventoryId);
    }
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'inventories':
        return <InventoryList onNavigate={handleNavigate} />;
      case 'preliminary':
        return currentInventoryId ? (
          <PreliminaryInventory 
            inventoryId={currentInventoryId} 
            onNavigate={handleNavigate} 
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">Wybierz inwentaryzację z listy</p>
            <button
              onClick={() => setCurrentPage('inventories')}
              className="mt-4 text-blue-600 hover:text-blue-800"
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
            <p className="text-gray-500">Wybierz inwentaryzację z listy</p>
            <button
              onClick={() => setCurrentPage('inventories')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Powróć do listy inwentaryzacji
            </button>
          </div>
        );
      case 'export':
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Eksport dostępny w sekcji Inwentaryzacja końcowa</p>
            <button
              onClick={() => setCurrentPage('inventories')}
              className="mt-4 text-blue-600 hover:text-blue-800"
            >
              Powróć do listy inwentaryzacji
            </button>
          </div>
        );
      default:
        return <InventoryList onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderCurrentPage()}
    </Layout>
  );
}

export default App;