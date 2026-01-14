import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, Users, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Dashboard({ user }) {
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
            const roomsSnapshot = await getDocs(query(collection(db, "rooms"), where("userId", "==", user.uid)));
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
                const unpaidSnapshot = await getDocs(query(
                    collection(db, "invoices"),
                    where("status", "==", "Chưa thanh toán"),
                    where("userId", "==", user.uid)
                ));
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
                const revenueSnapshot = await getDocs(query(collection(db, "revenue"), where("userId", "==", user.uid)));
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
            <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Dashboard</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Chào mừng trở lại! Dưới đây là tổng quan hệ thống của bạn.</p>
                </div>
                <button
                    onClick={fetchData}
                    className="btn-secondary"
                    disabled={isRefreshing}
                    style={{ borderRadius: 'var(--radius-full)' }}
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    {isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                </button>
            </header>

            {loading && !isRefreshing ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <RefreshCw size={40} className="animate-spin" style={{ color: 'var(--primary)' }} />
                        <p style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Gửi yêu cầu tới Firebase...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{
                                    backgroundColor: `${stat.color}15`,
                                    color: stat.color,
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    boxShadow: `0 8px 16px -4px ${stat.color}20`
                                }}>
                                    {React.cloneElement(stat.icon, { size: 28 })}
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>{stat.title}</p>
                                    <h3 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)' }}>{stat.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Biểu đồ doanh thu</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                    Doanh thu (VNĐ)
                                </div>
                            </div>
                        </div>

                        {chartData.length > 0 ? (
                            <div style={{ width: '100%', height: 320 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="var(--text-muted)"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontWeight: 500 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="var(--text-muted)"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={{ fontWeight: 500 }}
                                            tickFormatter={(value) => `${value / 1000000}M`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)',
                                                boxShadow: 'var(--shadow-lg)',
                                                padding: '1rem'
                                            }}
                                            itemStyle={{ fontWeight: 700, color: 'var(--primary)' }}
                                            cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="var(--primary)"
                                            fillOpacity={1}
                                            fill="url(#colorRev)"
                                            strokeWidth={3}
                                            animationDuration={1500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div style={{
                                height: 320,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(217, 119, 6, 0.02)',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px dashed var(--border)'
                            }}>
                                <div style={{
                                    backgroundColor: 'var(--primary-light)',
                                    padding: '1.25rem',
                                    borderRadius: '50%',
                                    marginBottom: '1.25rem',
                                    color: 'var(--primary)'
                                }}>
                                    <Home size={32} />
                                </div>
                                <h4 style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem', fontSize: '1.125rem' }}>Dữ liệu đang được tổng hợp</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', maxWidth: '300px', textAlign: 'center' }}>Khi có các giao dịch thanh toán, biểu đồ phân tích doanh thu sẽ hiển thị tại đây.</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
