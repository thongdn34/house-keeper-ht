import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, Users, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Dashboard() {
    const [stats, setStats] = useState([
        { title: 'Tổng nhà', value: '...', icon: <Home size={24} />, color: '#0ea5e9' },
        { title: 'Tổng phòng', value: '...', icon: <CheckCircle size={24} />, color: '#10b981' },
        { title: 'Khách thuê', value: '...', icon: <Users size={24} />, color: '#8b5cf6' },
        { title: 'Chưa thanh toán', value: '...', icon: <Clock size={24} />, color: '#f59e0b' },
    ]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Fetch Rooms
            const roomsSnapshot = await getDocs(collection(db, "rooms"));
            const roomsData = roomsSnapshot.docs.map(doc => doc.data());

            // Calculate Stats
            const totalRooms = roomsData.length;
            const rentedRooms = roomsData.filter(r => r.status === 'Đang thuê').length;

            // Get unique houses (assuming house is a field in rooms)
            const uniqueHouses = [...new Set(roomsData.map(r => r.house))].filter(Boolean);
            const totalHouses = uniqueHouses.length;

            // Fetch Invoices/Payments for "Chưa thanh toán"
            // For now, let's check a hypothetical invoices collection or set to 0
            let unpaidInvoices = 0;
            try {
                const unpaidSnapshot = await getDocs(query(collection(db, "invoices"), where("status", "==", "Chưa thanh toán")));
                unpaidInvoices = unpaidSnapshot.size;
            } catch (e) {
                console.warn("Invoices collection not found or accessible", e);
            }

            // Update Stats
            setStats([
                { title: 'Tổng nhà', value: totalHouses.toString(), icon: <Home size={24} />, color: '#0ea5e9' },
                { title: 'Tổng phòng', value: totalRooms.toString(), icon: <CheckCircle size={24} />, color: '#10b981' },
                { title: 'Khách thuê', value: rentedRooms.toString(), icon: <Users size={24} />, color: '#8b5cf6' },
                { title: 'Chưa thanh toán', value: unpaidInvoices.toString(), icon: <Clock size={24} />, color: '#f59e0b' },
            ]);

            // Fetch Chart Data
            try {
                const revenueSnapshot = await getDocs(collection(db, "revenue"));
                if (!revenueSnapshot.empty) {
                    const revData = revenueSnapshot.docs.map(doc => doc.data()).sort((a, b) => a.order - b.order);
                    setChartData(revData);
                } else {
                    setChartData([]);
                }
            } catch (e) {
                console.warn("Revenue collection not found", e);
                setChartData([]);
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="page-container fade-in">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Tổng quan hệ thống quản lý phòng trọ</p>
                </div>
                <button
                    onClick={fetchData}
                    className="btn-secondary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.625rem 1.25rem',
                        borderRadius: '0.75rem',
                        backgroundColor: 'white',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Đang làm mới...' : 'Làm mới'}
                </button>
            </header>

            {loading && !isRefreshing ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <RefreshCw size={48} className="animate-spin" style={{ color: 'var(--primary)' }} />
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ backgroundColor: `${stat.color}15`, color: stat.color, padding: '0.75rem', borderRadius: '0.75rem' }}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{stat.title}</p>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.125rem', fontWeight: '600' }}>Doanh thu gần đây</h3>

                        {chartData.length > 0 ? (
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{
                                height: 300,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(14, 165, 233, 0.03) 100%)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px dashed var(--border)'
                            }}>
                                <div style={{
                                    backgroundColor: '#f1f5f9',
                                    padding: '1rem',
                                    borderRadius: '50%',
                                    marginBottom: '1rem',
                                    color: 'var(--text-muted)'
                                }}>
                                    <AreaChart size={32} />
                                </div>
                                <h4 style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Chưa có dữ liệu doanh thu</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tính năng thống kê sẽ hiển thị khi có dữ liệu thanh toán (Coming Soon)</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
