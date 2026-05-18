const BASE_URL = 'http://localhost:3000/api';

export async function request(method, path, body = null) {
  const options = {
    method,
    credentials: 'include',
    headers: {},
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (body) => request('POST', '/auth/register', body),
  login: (body) => request('POST', '/auth/login', body),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),

  getRecords: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request('GET', `/records${query ? '?' + query : ''}`);
  },
  getRecord: (id) => request('GET', `/records/${id}`),
  uploadRecord: (body) => request('POST', '/records/upload', body),
  deleteRecord: (id) => request('DELETE', `/records/${id}`),

  getConsents: () => request('GET', '/consent'),
  grantConsent: (body) => request('POST', '/consent/grant', body),
  revokeConsent: (body) => request('POST', '/consent/revoke', body),

  getAuditLogs: (page = 1) => request('GET', `/audit?page=${page}&limit=20`),
  getNotifications: () => request('GET', '/audit/notifications'),

  getUsers: () => request('GET', '/admin/users'),
  updateUserRole: (id, role) => request('PATCH', `/admin/users/${id}/role`, { role }),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`),
  getAdminAudit: (page = 1) => request('GET', `/admin/audit?page=${page}&limit=20`),
  getStats: () => request('GET', '/admin/stats'),
};
