import { useState, useEffect } from 'react';
import { request } from '../services/api';

const STATUS_UI = {
  PENDING: { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', label: 'Pending review' },
  APPROVED: { color: 'text-green-400 bg-green-500/10 border-green-500/20', label: 'Approved' },
  REJECTED: { color: 'text-red-400 bg-red-500/10 border-red-500/20', label: 'Rejected' },
};

export default function DoctorRequest() {
  const [status, setStatus] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [paraCode, setParaCode] = useState('');
  const [specialization, setSpecialization] = useState('');

  useEffect(() => {
    request('GET', '/users/doctor-request/status')
      .then(data => { setStatus(data.status); setAdminNote(data.adminNote || ''); })
      .catch(() => setStatus('NONE'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setSubmitting(true);

    try {
      await request('POST', '/users/doctor-request', { fullName, paraCode, specialization });
      setSuccess('Request submitted successfully. An admin will review it shortly.');
      setStatus('PENDING');
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading...</div>;

  const ui = status !== 'NONE' ? STATUS_UI[status] : null;

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Become a Doctor</h2>

      {ui && (
        <div className={`border rounded-xl p-4 mb-6 ${ui.color}`}>
          <p className="font-medium">{ui.label}</p>
          {adminNote && <p className="text-sm mt-1 opacity-80">Note: {adminNote}</p>}
        </div>
      )}

      {status === 'PENDING' ? (
        <p className="text-gray-500 text-sm">Your request is under review. You will be notified once a decision is made.</p>
      ) : status === 'APPROVED' ? (
        <p className="text-gray-500 text-sm">Your request was approved. Your account has been upgraded to Doctor.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-lg">
          {status === 'REJECTED' && (
            <p className="text-gray-400 text-sm mb-5">You may resubmit your request below.</p>
          )}

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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="Dr. Ion Popescu"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Seal code</label>
              <input
                type="text"
                value={paraCode}
                onChange={e => setParaCode(e.target.value)}
                required
                placeholder="AB1234"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={e => setSpecialization(e.target.value)}
                required
                placeholder="Cardiology"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 transition text-sm"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
