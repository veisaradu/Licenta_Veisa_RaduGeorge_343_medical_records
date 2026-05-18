import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLogs = (page) => {
    setLoading(true);
    Promise.all([
      api.getAuditLogs(page),
      user?.role === 'PATIENT' && page === 1 ? api.getNotifications() : Promise.resolve(null),
    ])
      .then(([data, notifData]) => {
        setLogs(data.logs);
        setPagination(data.pagination);
        if (notifData !== null) setNotifications(notifData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(1);
  }, [user]);

  const handlePage = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchLogs(newPage);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Audit Log</h2>

      {user?.role === 'PATIENT' && notifications.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Access to Your Records</h3>
          <div className="grid gap-2">
            {notifications.map(n => (
              <div key={n.id} className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-yellow-400 text-sm font-medium">{userName(n.user)}</span>
                  <span className="text-gray-500 text-xs ml-2">viewed your record</span>
                </div>
                <span className="text-gray-600 text-xs">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : (
        <>
          <div className="grid gap-3">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-16 border border-gray-800 rounded-xl">
                No audit logs yet.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
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

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-gray-500 text-xs">
                {pagination.total} entries — page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 disabled:text-gray-600 disabled:border-gray-800 hover:border-gray-500 transition"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => handlePage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-300 disabled:text-gray-600 disabled:border-gray-800 hover:border-gray-500 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
