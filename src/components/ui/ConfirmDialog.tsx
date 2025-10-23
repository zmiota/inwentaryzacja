import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (password?: string) => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  requirePassword?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Anuluj',
  onConfirm,
  onCancel,
  type = 'warning',
  requirePassword = false
}: ConfirmDialogProps) {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(requirePassword ? password : undefined);
    setPassword('');
  };

  const handleCancel = () => {
    onCancel();
    setPassword('');
  };

  const colors = {
    danger: {
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      icon: 'text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleCancel}
      />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 animate-scale-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${colors[type].icon}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
                {message}
              </p>

              {requirePassword && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Wprowadź swoje hasło, aby potwierdzić:
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="Hasło"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && password) {
                        handleConfirm();
                      }
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end gap-3 rounded-b-lg">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={requirePassword && !password}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors[type].button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
