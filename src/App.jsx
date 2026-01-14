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
    Search,
    Menu,
    X
} from 'lucide-react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RoomManagement from './pages/RoomManagement';
import RentRoom from './pages/RentRoom';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
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

    const toggleMobileMenu = () => setShowMobileMenu(!showMobileMenu);
    const closeMobileMenu = () => setShowMobileMenu(false);

    if (loading) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    if (!user && location.pathname !== '/login') {
        return <Login />;
    }

    if (location.pathname === '/login') return <Login />;

    return (
        <div className="app-container">
            {/* Sidebar Overlay */}
            <div
                className={`sidebar-overlay ${showMobileMenu ? 'visible' : ''}`}
                onClick={closeMobileMenu}
            ></div>

            {/* Sidebar */}
            <aside className={`sidebar ${showMobileMenu ? 'open' : ''}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'var(--primary)', padding: '0.625rem', borderRadius: '0.875rem', boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)' }}>
                            <HomeIcon size={24} color="white" />
                        </div>
                        <span style={{ fontSize: '1.375rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Happy House</span>
                    </div>
                    <button
                        onClick={closeMobileMenu}
                        className="mobile-menu-btn"
                        style={{ display: 'none' }} // Will be shown via CSS or media query in JS if needed, but let's use CSS
                    >
                        <X size={24} color="white" />
                    </button>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.5, marginBottom: '0.75rem', paddingLeft: '1rem', fontWeight: '700', letterSpacing: '0.05em' }}>Hệ thống</p>
                    <MenuLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" onClick={closeMobileMenu} />
                    <MenuLink to="/rooms" icon={<HomeIcon size={20} />} label="Quản lý phòng" onClick={closeMobileMenu} />
                    <MenuLink to="/rent" icon={<UserPlus size={20} />} label="Thuê phòng" onClick={closeMobileMenu} />
                    <MenuLink to="/tenants" icon={<Users size={20} />} label="Khách thuê" onClick={closeMobileMenu} />
                </nav>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                    <div
                        onClick={() => { handleLogout(); closeMobileMenu(); }}
                        className="nav-link"
                        style={{ cursor: 'pointer' }}
                    >
                        <LogOut size={20} />
                        <span>Đăng xuất</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="main-content">
                <header className="app-header">
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                            <Menu size={24} />
                        </button>
                        <div className="search-input-wrapper header-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                className="search-input"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="notification-btn" style={{ position: 'relative', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Bell size={22} />
                            <span style={{ position: 'absolute', top: '0', right: '0', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
                        </button>
                        <div className="header-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
                            <div className="user-info" style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: '700' }}>{user?.displayName || 'Admin'}</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '500' }}>Quản lý</p>
                            </div>
                            <img
                                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'Admin'}&background=d97706&color=fff`}
                                alt="Avatar"
                                className="user-avatar"
                                style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', border: '2px solid white', boxShadow: 'var(--shadow-sm)' }}
                            />
                        </div>
                    </div>
                </header>

                <section style={{ flex: 1, overflowY: 'auto' }}>
                    <Routes>
                        <Route path="/" element={<ProtectedRoute user={user}><Dashboard user={user} /></ProtectedRoute>} />
                        <Route path="/rooms" element={<ProtectedRoute user={user}><RoomManagement user={user} /></ProtectedRoute>} />
                        <Route path="/rent" element={<ProtectedRoute user={user}><RentRoom user={user} /></ProtectedRoute>} />
                        <Route path="/tenants" element={
                            <ProtectedRoute user={user}>
                                <div className="page-container glass-card" style={{ margin: '2.5rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Khách thuê</h2>
                                    <div style={{ padding: '3rem', textAlign: 'center', background: 'rgba(217, 119, 6, 0.03)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                                        <Users size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.5 }} />
                                        <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Chức năng đang được phát triển...</p>
                                    </div>
                                </div>
                            </ProtectedRoute>
                        } />
                    </Routes>
                </section>
            </main>
        </div>
    );
}

function MenuLink({ to, icon, label, onClick }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            {icon}
            <span>{label}</span>
        </NavLink>
    );
}

export default App;
