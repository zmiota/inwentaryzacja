import React, { createContext, useContext, useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

interface NetworkContextType {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-center space-x-2">
            <WifiOff className="h-5 w-5" />
            <span className="font-medium">Brak połączenia z siecią</span>
            <span className="text-red-100">Sprawdź swoje połączenie internetowe</span>
          </div>
        </div>
      )}
      <div className={showOfflineBanner ? 'pt-14' : ''}>
        {children}
      </div>
    </NetworkContext.Provider>
  );
};
