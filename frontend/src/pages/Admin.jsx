import { useState, useEffect } from 'react';
import { api, request } from '../services/api';

const ACTION_COLORS = {
  VIEW: 'text-blue-400 bg-blue-600/10',
  UPLOAD: 'text-green-400 bg-green-600/10',
  CONSENT_GRANT: 'text-purple-400 bg-purple-600/10',
  CONSENT_REVOKE: 'text-red-400 bg-red-600/10',
  DOCTOR_APPROVED: 'text-yellow-400 bg-yellow-600/10',
};

function userName(user) {
  if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
  return user?.email || 'Unknown';
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    Promise.all([
      api.getStats(),
      api.getUsers(),
      request('GET', '/admin/doctor-requests'),
    ])
      .then(([statsData, usersData, requestsData]) => {
        setStats(statsData);
        setUsers(usersData);
        setRequests(Array.isArray(requestsData) ? requestsData : []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  const loadAudit = (page) => {
    setAuditLoading(true);
    api.getAdminAudit(page)
      .then(data => {
        setLogs(data.logs);
        setAuditPagination(data.pagination);
      })
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { loadAudit(auditPage); }, [auditPage]);

  const handleApprove = async (id) => {
    await request('PATCH', `/admin/doctor-requests/${id}/approve`);
    load();
    loadAudit(auditPage);
  };

  const handleReject = async (id) => {
    await request('PATCH', `/admin/doctor-requests/${id}/reject`, { adminNote: 'Rejected by admin' });
    load();
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user?')) return;
    await api.deleteUser(id);
    load();
  };

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Users', value: stats.totalUsers },
            { label: 'Records', value: stats.totalRecords },
            { label: 'Consents', value: stats.totalConsents },
            { label: 'Audit Logs', value: stats.totalLogs },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-gray-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {requests.filter(r => r.status === 'PENDING').length > 0 && (
        <div>
          <h3 className="text-white font-medium mb-3">Pending Doctor Requests</h3>
          <div className="grid gap-3">
            {requests.filter(r => r.status === 'PENDING').map(r => (
              <div key={r.id} className="bg-gray-900 border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{r.fullName}</p>
                  <p className="text-gray-500 text-sm">{r.user?.email} · Seal: {r.paraCode} · {r.specialization}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(r.id)} className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg transition">Approve</button>
                  <button onClick={() => handleReject(r.id)} className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg transition">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-white font-medium mb-3">All Users</h3>
        <div className="grid gap-2">
          {users.map(u => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white text-sm">{u.email}</p>
                <p className="text-gray-500 text-xs mt-0.5">CNP: {u.cnp} · {new Date(u.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  u.role === 'ADMIN' ? 'text-yellow-400 bg-yellow-600/10' :
                  u.role === 'DOCTOR' ? 'text-blue-400 bg-blue-600/10' :
                  'text-gray-400 bg-gray-800'
                }`}>{u.role}</span>
                <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-300 text-sm transition">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Audit Log</h3>
          <span className="text-gray-600 text-xs">{auditPagination.total} entries</span>
        </div>

        {auditLoading ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : (
          <div className="grid gap-2">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8 border border-gray-800 rounded-xl text-sm">
                No audit logs yet.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[log.action] || 'text-gray-400 bg-gray-800'}`}>
                      {log.action}
                    </span>
                    <div>
                      <p className="text-white text-sm">{userName(log.user)}</p>
                      {log.documentId && (
                        <p className="text-gray-600 text-xs font-mono mt-0.5">{log.documentId}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        )}

        {auditPagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-gray-600 text-xs">
              Page {auditPagination.page} of {auditPagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                disabled={auditPage === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 disabled:text-gray-600 disabled:border-gray-800 hover:border-gray-500 transition"
              >
                ← Prev
              </button>
              <button
                onClick={() => setAuditPage(p => Math.min(auditPagination.totalPages, p + 1))}
                disabled={auditPage === auditPagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 disabled:text-gray-600 disabled:border-gray-800 hover:border-gray-500 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
