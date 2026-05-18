import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { deriveKeyFromPassword, decryptAndImportPrivateKey } from '../crypto/keys';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [pendingUserData, setPendingUserData] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    api.me()
      .then(userData => {
        setUser({ ...userData, userId: userData.id });
        setPendingUserData(userData);
        setNeedsUnlock(true);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlockError('');
    try {
      const fullUser = await api.login({
        email: pendingUserData.email,
        password: unlockPassword,
      });
      const derivedKey = await deriveKeyFromPassword(unlockPassword, fullUser.pbkdf2Salt);
      const [encryptedPrivKey, iv] = fullUser.encryptedPrivKey.split('.');
      const privKey = await decryptAndImportPrivateKey(encryptedPrivKey, iv, derivedKey);
      setPrivateKey(privKey);
      setNeedsUnlock(false);
      setUnlockPassword('');
    } catch (err) {
      setUnlockError('Invalid password');
    }
  };

  const login = (userData, privKey) => {
    setUser({ ...userData, userId: userData.userId || userData.id });
    setPrivateKey(privKey);
    setNeedsUnlock(false);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPrivateKey(null);
    setNeedsUnlock(false);
    setPendingUserData(null);
  };

  if (needsUnlock && pendingUserData) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl shadow-xl p-8">
          <h2 className="text-white font-bold text-lg mb-1">Session restored</h2>
          <p className="text-gray-400 text-sm mb-6">
            Enter your password to unlock your encryption key.
          </p>
          {unlockError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
              {unlockError}
            </div>
          )}
          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              placeholder="Your password"
              value={unlockPassword}
              onChange={e => setUnlockPassword(e.target.value)}
              autoFocus
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2.5 transition"
            >
              Unlock
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
            >
              Sign out instead
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, privateKey, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
