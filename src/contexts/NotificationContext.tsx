import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import Toast, { ToastType } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  requirePassword?: boolean;
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (options: ConfirmOptions) => Promise<boolean | string>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean | string) => void) | null;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    resolve: null
  });

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean | string> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback((password?: string) => {
    if (confirmState.resolve) {
      if (confirmState.options.requirePassword && password) {
        confirmState.resolve(password);
      } else {
        confirmState.resolve(true);
      }
    }
    setConfirmState({
      isOpen: false,
      options: { title: '', message: '' },
      resolve: null
    });
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState({
      isOpen: false,
      options: { title: '', message: '' },
      resolve: null
    });
  }, [confirmState]);

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}

      <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.options.title}
        message={confirmState.options.message}
        confirmText={confirmState.options.confirmText}
        cancelText={confirmState.options.cancelText}
        type={confirmState.options.type}
        requirePassword={confirmState.options.requirePassword}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
