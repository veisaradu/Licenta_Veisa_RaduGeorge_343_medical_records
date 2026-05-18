import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { decryptDocument, verifyIntegrity } from '../crypto/documents';

const CATEGORIES = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];

const CATEGORY_LABELS = {
  ANALYSES: 'Analyses',
  PRESCRIPTIONS: 'Prescriptions',
  IMAGING: 'Imaging',
  CONSULTATIONS: 'Consultations',
};

function getFileType(fileName) {
  if (!fileName) return 'application/octet-stream';
  if (fileName.endsWith('.pdf')) return 'application/pdf';
  if (fileName.match(/\.(jpg|jpeg)$/i)) return 'image/jpeg';
  if (fileName.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

export default function Records() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const { user, privateKey } = useAuth();

  const loadRecords = (p = 1, s = search, c = category) => {
    setLoading(true);
    const params = { page: p, limit: 10 };
    if (s) params.search = s;
    if (c) params.category = c;
    api.getRecords(params)
      .then(data => {
        setRecords(data.records ?? data);
        setPagination(data.pagination ?? null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadRecords(page); }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadRecords(1, search, category);
  };

  const handleClear = () => {
    setSearch('');
    setCategory('');
    setPage(1);
    loadRecords(1, '', '');
  };

  const handleView = async (record, mode = 'view') => {
    if (!privateKey) {
      alert('Session expired. Please log in again.');
      return;
    }
    setDownloading(prev => ({ ...prev, [record.id]: true }));
    try {
      const recordData = await api.getRecord(record.id);

      const ipfsData = await fetch(
        `https://gateway.pinata.cloud/ipfs/${recordData.ipfsCid}`
      ).then(r => r.json());

      const decrypted = await decryptDocument(
        ipfsData.encryptedContent,
        recordData.encryptedAesKey,
        ipfsData.iv,
        privateKey
      );

      const intact = await verifyIntegrity(decrypted, record.documentHash);
      if (!intact) {
        alert('WARNING: Integrity check FAILED!');
        return;
      }

      const blob = new Blob([decrypted], { type: getFileType(record.fileName) });
      const url = URL.createObjectURL(blob);

      if (mode === 'view' && record.fileName?.match(/\.(pdf|jpg|jpeg|png)$/i)) {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = record.fileName || `document_${record.id}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) {
      alert('Decryption failed: ' + err.message);
    } finally {
      setDownloading(prev => ({ ...prev, [record.id]: false }));
    }
  };

  const handleDelete = async (recordId) => {
    if (!confirm('Delete this record? The encryption key will be destroyed permanently.')) return;
    try {
      await api.deleteRecord(recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Medical Records</h2>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by filename..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm transition"
        >
          Search
        </button>
        {(search || category) && (
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg px-4 py-2 text-sm transition"
          >
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : records.length === 0 ? (
        <div className="text-gray-500 text-center py-16 border border-gray-800 rounded-xl">
          No records found.
        </div>
      ) : (
        <div className="grid gap-4">
          {records.map(record => (
            <div key={record.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 mb-2">
                    {CATEGORY_LABELS[record.category]}
                  </span>
                  <p
                    className={`font-medium text-sm mt-1 ${user?.role === 'PATIENT' ? 'text-blue-300 hover:text-blue-200 cursor-pointer underline' : 'text-white'}`}
                    onClick={user?.role === 'PATIENT' ? () => handleView(record, 'view') : undefined}
                  >
                    {record.fileName || record.id}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    {new Date(record.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="text-gray-600 text-xs font-mono truncate max-w-48">{record.ipfsCid}</p>
                  <p className="text-gray-600 text-xs font-mono truncate max-w-48">
                    Hash: {record.documentHash?.slice(0, 20)}...
                  </p>
                  {user?.role === 'PATIENT' && (
                    <div className="flex gap-3 mt-1">
                      <button
                        onClick={() => handleView(record, 'download')}
                        disabled={downloading[record.id]}
                        className="text-blue-400 hover:text-blue-300 text-sm transition disabled:text-gray-600"
                      >
                        {downloading[record.id] ? 'Decrypting...' : '↓ Download'}
                      </button>
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-400 hover:text-red-300 text-sm transition"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition text-sm"
          >
            Previous
          </button>
          <span className="text-gray-500 text-sm">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
