import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  generateRSAKeyPair,
  exportPublicKey,
  exportAndEncryptPrivateKey,
  deriveKeyFromPassword,
  generateSalt,
} from '../crypto/keys';

export default function Register() {
  const [form, setForm] = useState({ email: '', cnp: '', firstName: '', lastName: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      const keyPair = await generateRSAKeyPair();
      const rsaPublicKey = await exportPublicKey(keyPair.publicKey);
      const salt = generateSalt();
      const derivedKey = await deriveKeyFromPassword(form.password, salt);
      const { encryptedPrivKey, iv } = await exportAndEncryptPrivateKey(keyPair.privateKey, derivedKey);

      await api.register({
        email: form.email,
        cnp: form.cnp,
        firstName: form.firstName,
        lastName: form.lastName,
        password: form.password,
        role: 'PATIENT',
        rsaPublicKey,
        encryptedPrivKey: encryptedPrivKey + '.' + iv,
        pbkdf2Salt: salt,
      });

      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2">MedChain</h1>
        <p className="text-gray-400 mb-8">Create your account</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg mb-6 text-sm">
            Generating cryptographic keys... This may take a moment.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">First Name</label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
                placeholder="Ion"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Last Name</label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
                placeholder="Popescu"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">CNP</label>
            <input
              type="text"
              name="cnp"
              value={form.cnp}
              onChange={handleChange}
              required
              maxLength={13}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
              placeholder="1234567890123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm Password</label>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-gray-500 text-sm mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
