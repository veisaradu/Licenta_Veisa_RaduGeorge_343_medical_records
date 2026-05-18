import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function DefaultRedirect() {
    const { user } = useAuth();
    if (user?.role === 'ADMIN') return <Navigate to="/admin" />;
    return <Records />;
}
import Records from './Records';
import Upload from './Upload';
import Consent from './Consent';
import AuditLog from './AuditLog';
import Admin from './Admin';
import DoctorRequest from './DoctorRequest';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navLink = ({ isActive }) =>
        `block px-4 py-2 rounded-lg text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`;

    return (
        <div className="min-h-screen bg-gray-950 flex">
            <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col p-4">
                <div className="mb-8">
                    <h1 className="text-white font-bold text-lg">MedChain</h1>
                    <p className="text-gray-500 text-xs mt-1">{user?.firstName} {user?.lastName}</p>
                    <p className="text-gray-600 text-xs">{user?.email}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400">
                        {user?.role}
                    </span>
                </div>

                <nav className="flex flex-col gap-1 flex-1">
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/" end className={navLink}>Records</NavLink>
                    )}
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/upload" className={navLink}>Upload</NavLink>
                    )}
                    {user?.role === 'PATIENT' && (
                        <NavLink to="/consent" className={navLink}>Consent</NavLink>
                    )}
                    {user?.role !== 'ADMIN' && (
                        <NavLink to="/audit" className={navLink}>Audit Log</NavLink>
                    )}
                    {user?.role === 'PATIENT' && (
                        <NavLink to="/doctor-request" className={navLink}>Become a Doctor</NavLink>
                    )}
                    {user?.role === 'ADMIN' && (
                        <NavLink to="/admin" className={navLink}>Admin</NavLink>
                    )}
                </nav>

                <button
                    onClick={handleLogout}
                    className="text-left px-4 py-2 text-sm text-gray-500 hover:text-red-400 transition"
                >
                    Sign out
                </button>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <Routes>
                    <Route path="/" element={<DefaultRedirect />} />
                    <Route path="/upload" element={<Upload />} />
                    <Route path="/consent" element={<Consent />} />
                    <Route path="/audit" element={<AuditLog />} />
                    {user?.role === 'ADMIN' && <Route path="/admin/*" element={<Admin />} />}
                    {user?.role === 'PATIENT' && <Route path="/doctor-request" element={<DoctorRequest />} />}
                </Routes>
            </main>
        </div>
    );
}