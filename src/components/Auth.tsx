import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccessMessage('Konto zostało utworzone. Możesz się teraz zalogować.');
        setIsLogin(true);
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 rounded-2xl mb-4">
              <span className="text-2xl font-bold text-white">I</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              System Inwentaryzacji
            </h1>
            <p className="text-slate-600">
              {isLogin ? 'Zaloguj się do swojego konta' : 'Utwórz nowe konto'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="twoj@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Hasło
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              {!isLogin && (
                <p className="mt-2 text-sm text-slate-500">
                  Minimum 6 znaków
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Proszę czekać...</span>
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      <span>Zaloguj się</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Zarejestruj się</span>
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccessMessage(null);
              }}
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              {isLogin ? (
                <>
                  Nie masz konta? <span className="font-medium">Zarejestruj się</span>
                </>
              ) : (
                <>
                  Masz już konto? <span className="font-medium">Zaloguj się</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          System zarządzania inwentaryzacją
        </p>
      </div>
    </div>
  );
}
