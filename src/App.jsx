import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
    LayoutDashboard,
    Home as HomeIcon,
    UserPlus,
    Users,
    Settings,
    LogOut,
    Bell,
    Search
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RoomManagement from './pages/RoomManagement';
import RentRoom from './pages/RentRoom';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                // Check for session expiration (24 hours)
                let loginTime = localStorage.getItem('loginTime');
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;

                if (!loginTime) {
                    // If logged in but no timestamp (e.g. session from before update)
                    // Set it now so they get 24h from this first check
                    loginTime = now.toString();
                    localStorage.setItem('loginTime', loginTime);
                }

                if (now - parseInt(loginTime) > twentyFourHours) {
                    alert("Phiên đăng nhập đã hết hạn (24h). Vui lòng đăng nhập lại.");
                    handleLogout();
                } else {
                    setUser(u);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return unsub;
    }, [navigate, location]);

    useEffect(() => {
        const checkExpiration = () => {
            if (user) {
                const loginTime = localStorage.getItem('loginTime');
                const now = Date.now();
                const twentyFourHours = 24 * 60 * 60 * 1000;

                if (loginTime && (now - parseInt(loginTime) > twentyFourHours)) {
                    alert("Phiên đăng nhập đã hết hạn (24h). Vui lòng đăng nhập lại.");
                    handleLogout();
                }
            }
        };

        checkExpiration();
        // Also check every minute
        const interval = setInterval(checkExpiration, 60000);
        return () => clearInterval(interval);
    }, [user, location]);

    const handleLogout = async () => {
        localStorage.removeItem('loginTime');
        await signOut(auth);
        navigate('/login');
    };

    if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    if (!user && location.pathname !== '/login') {
        return <Login />;
    }

    if (location.pathname === '/login') return <Login />;

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside style={{
                width: 'var(--sidebar-width)',
                background: 'var(--bg-sidebar)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.2)', padding: '0.5rem', borderRadius: '0.75rem' }}>
                        <HomeIcon size={24} />
                    </div>
                    <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>Happy House</span>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>Menu chính</p>
                    <MenuLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                    <MenuLink to="/rooms" icon={<HomeIcon size={20} />} label="Quản lý phòng" />
                    <MenuLink to="/rent" icon={<UserPlus size={20} />} label="Thuê phòng" />
                    <MenuLink to="/tenants" icon={<Users size={20} />} label="Khách thuê" />
                </nav>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                    <div
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            opacity: 0.8,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <header style={{
                    height: 'var(--header-height)',
                    background: 'white',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem'
                }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm nhanh..."
                            style={{ width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', borderRadius: '2rem', border: '1px solid var(--border)', fontSize: '0.875rem', background: '#f1f5f9' }}
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <button style={{ position: 'relative', background: 'none', border: 'none', color: 'var(--text-muted)' }}>
                            <Bell size={20} />
                            <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user?.displayName || 'Admin'}</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Administrator</p>
                            </div>
                            <img
                                src={user?.photoURL || "https://ui-avatars.com/api/?name=Admin&background=0ea5e9&color=fff"}
                                alt="Avatar"
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--border)' }}
                            />
                        </div>
                    </div>
                </header>

                <section style={{ flex: 1, overflowY: 'auto' }}>
                    <Routes>
                        <Route path="/" element={<ProtectedRoute user={user}><Dashboard /></ProtectedRoute>} />
                        <Route path="/rooms" element={<ProtectedRoute user={user}><RoomManagement /></ProtectedRoute>} />
                        <Route path="/rent" element={<ProtectedRoute user={user}><RentRoom /></ProtectedRoute>} />
                        <Route path="/tenants" element={
                            <ProtectedRoute user={user}>
                                <div className="page-container">
                                    <h2>Khách thuê</h2>
                                    <p>Chức năng đang được cập nhật...</p>
                                </div>
                            </ProtectedRoute>
                        } />
                    </Routes>
                </section>
            </main>
        </div>
    );
}

function MenuLink({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '0.75rem',
                textDecoration: 'none',
                color: 'white',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.2s',
                opacity: isActive ? 1 : 0.8
            })}
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    );
}

export default App;
