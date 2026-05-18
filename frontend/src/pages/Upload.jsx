import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { encryptDocument } from '../crypto/documents';
import { importPublicKey } from '../crypto/keys';

const CATEGORIES = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];

export default function Upload() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('ANALYSES');
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    try {
      const targetOwnerId = user.role === 'PATIENT' ? user.userId : patientId;

      setStep('Fetching patient public key...');
      const me = await api.me();
      let rsaPublicKeyBase64 = me.rsaPublicKey;
      let ownerId = user.userId;

      if (user.role === 'DOCTOR') {
        const patientData = await fetch(
          `http://localhost:3000/api/users/search?cnp=${patientId}`,
          { credentials: 'include' }
        ).then(r => r.json());
        if (patientData.error) throw new Error(patientData.error);

        const pubkeyData = await fetch(
          `http://localhost:3000/api/admin/users/${patientData.id}/pubkey`,
          { credentials: 'include' }
        ).then(r => r.json());
        if (pubkeyData.error) throw new Error(pubkeyData.error);

        rsaPublicKeyBase64 = pubkeyData.rsaPublicKey;
        ownerId = patientData.id;
      }

      setStep('Encrypting document...');
      const rsaPublicKey = await importPublicKey(rsaPublicKeyBase64);
      const { encryptedContent, encryptedAesKey, iv, documentHash } = await encryptDocument(file, rsaPublicKey);

      setStep('Uploading to IPFS & registering on blockchain...');
      const result = await api.uploadRecord({
        encryptedContent,
        encryptedAesKey,
        documentHash,
        category,
        ownerId,
        iv,
        fileName: file.name,
      });

      setSuccess(`Document uploaded successfully. IPFS CID: ${result.ipfsCid}`);
      setFile(null);
      setStep('');
    } catch (err) {
      setError(err.message || 'Upload failed');
      setStep('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Upload Medical Document</h2>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {success}
          </div>
        )}
        {step && (
          <div className="bg-blue-500/10 border border-blue-500/30 text-blue-400 px-4 py-3 rounded-lg mb-4 text-sm">
            {step}
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-5">
          {user?.role === 'DOCTOR' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Patient CNP
              </label>
              <input
                type="text"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                required
                placeholder="1234567890123"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Document
            </label>
            <input
              type="file"
              onChange={e => setFile(e.target.files[0])}
              required
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-sm"
            />
            {file && (
              <p className="text-gray-500 text-xs mt-1">{file.name} — {(file.size / 1024).toFixed(1)} KB</p>
            )}
          </div>

          <div className="bg-gray-800/50 rounded-lg p-3 text-xs text-gray-500">
            Document is encrypted in your browser before upload. The server never sees the content in plaintext.
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition"
          >
            {loading ? step || 'Processing...' : 'Encrypt & Upload'}
          </button>
        </form>
      </div>
    </div>
  );
}