import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['ANALYSES', 'PRESCRIPTIONS', 'IMAGING', 'CONSULTATIONS'];

export default function Consent() {
  const [consents, setConsents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [doctorCnp, setDoctorCnp] = useState('');
  const [category, setCategory] = useState('ANALYSES');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  const loadConsents = () => {
    api.getConsents().then(setConsents).finally(() => setLoading(false));
  };

  useEffect(() => { loadConsents(); }, []);

  const handleGrant = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setSubmitting(true);
    try {
      await api.grantConsent({ doctorCnp, category });
      setSuccess('Consent granted successfully');
      setDoctorCnp('');
      loadConsents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (consent) => {
    try {
      await api.revokeConsent({ doctorCnp: consent.doctor?.cnp, category: consent.category });
      loadConsents();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Consent Management</h2>

      {user?.role === 'PATIENT' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-4">Grant Access to Doctor</h3>
          {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
          {success && <div className="text-green-400 text-sm mb-3">{success}</div>}
          <form onSubmit={handleGrant} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Doctor CNP (13 digits)"
              value={doctorCnp}
              onChange={e => setDoctorCnp(e.target.value)}
              required
              maxLength={13}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg py-2.5 font-medium transition"
            >
              {submitting ? 'Granting...' : 'Grant Consent'}
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-3">
        {consents.length === 0 ? (
          <div className="text-gray-500 text-center py-16 border border-gray-800 rounded-xl">
            No consents yet.
          </div>
        ) : (
          consents.map(consent => (
            <div key={consent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${consent.granted ? 'text-green-400 bg-green-600/10' : 'text-red-400 bg-red-600/10'}`}>
                  {consent.granted ? 'Active' : 'Revoked'}
                </span>
                <span className="text-white text-sm">{consent.category}</span>
                <p className="text-gray-500 text-xs mt-1">
                  {user?.role === 'PATIENT'
                    ? `Doctor: ${consent.doctor?.firstName} ${consent.doctor?.lastName}`
                    : `Patient: ${consent.patient?.firstName} ${consent.patient?.lastName}`}
                </p>
              </div>
              {user?.role === 'PATIENT' && consent.granted && (
                <button
                  onClick={() => handleRevoke(consent)}
                  className="text-red-400 hover:text-red-300 text-sm transition"
                >
                  Revoke
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
