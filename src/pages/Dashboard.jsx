import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Home, Users, CheckCircle, Clock, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function Dashboard({ user }) {
    const [stats, setStats] = useState([
        { title: 'Tổng nhà', value: '...', icon: <Home size={24} />, color: '#0ea5e9' },
        { title: 'Tổng phòng', value: '...', icon: <CheckCircle size={24} />, color: '#10b981' },
        { title: 'Khách thuê', value: '...', icon: <Users size={24} />, color: '#8b5cf6' },
        { title: 'Chưa thanh toán', value: '...', icon: <Clock size={24} />, color: '#f59e0b' },
    ]);
    const [invoices, setInvoices] = useState([]);
    const [timeRange, setTimeRange] = useState('month'); // 'week', 'month', 'year'
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const processChartData = useCallback((invoicesData, range) => {
        const now = new Date();

        if (range === 'week') {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const dayName = d.toLocaleDateString('vi-VN', { weekday: 'short' });
                const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                days.push({
                    name: `${dayName} ${dateStr}`,
                    dateKey: d.toISOString().split('T')[0],
                    revenue: 0
                });
            }

            invoicesData.forEach(inv => {
                const invDate = inv.date.split('T')[0];
                const day = days.find(d => d.dateKey === invDate);
                if (day) day.revenue += inv.amount;
            });
            return days;
        }

        if (range === 'month') {
            const months = [
                'Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06',
                'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'
            ];
            const data = months.map(m => ({ name: m, revenue: 0 }));
            const currentYear = now.getFullYear();

            invoicesData.forEach(inv => {
                const d = new Date(inv.date);
                if (d.getFullYear() === currentYear) {
                    data[d.getMonth()].revenue += inv.amount;
                }
            });
            return data;
        }

        if (range === 'year') {
            const currentYear = now.getFullYear();
            const years = [];
            for (let i = 4; i >= 0; i--) {
                years.push({ name: (currentYear - i).toString(), revenue: 0 });
            }

            invoicesData.forEach(inv => {
                const d = new Date(inv.date);
                const yearStr = d.getFullYear().toString();
                const yearData = years.find(y => y.name === yearStr);
                if (yearData) yearData.revenue += inv.amount;
            });
            return years;
        }
        return [];
    }, []);

    const growthMetrics = useMemo(() => {
        const now = new Date();
        const getPeriodRevenue = (daysBack, durationDays) => {
            const end = new Date();
            end.setDate(now.getDate() - daysBack);
            const start = new Date();
            start.setDate(end.getDate() - durationDays);

            return invoices.reduce((sum, inv) => {
                const invDate = new Date(inv.date);
                if (invDate >= start && invDate < end) {
                    return sum + inv.amount;
                }
                return sum;
            }, 0);
        };

        const calculateGrowth = (durationDays, label) => {
            const current = getPeriodRevenue(0, durationDays);
            const previous = getPeriodRevenue(durationDays, durationDays);

            let percentage = 0;
            if (previous > 0) {
                percentage = ((current - previous) / previous) * 100;
            } else if (current > 0) {
                percentage = 100;
            }

            return {
                label,
                current,
                previous,
                percentage: percentage.toFixed(1),
                isUp: percentage > 0,
                isDown: percentage < 0,
                isNeutral: percentage === 0
            };
        };

        // Standardize durations in days (approximate for months/years)
        return [
            calculateGrowth(10, '10 ngày'),
            calculateGrowth(30, '30 ngày'),
            calculateGrowth(90, '3 tháng'),
            calculateGrowth(180, '6 tháng'),
            calculateGrowth(365, '1 năm')
        ];
    }, [invoices]);

    const chartData = useMemo(() => {
        return processChartData(invoices, timeRange);
    }, [invoices, timeRange, processChartData]);

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

            // Fetch Invoices for Chart Data
            try {
                const invoicesSnapshot = await getDocs(query(
                    collection(db, "invoices"),
                    where("userId", "==", user.uid),
                    where("status", "==", "Đã thanh toán")
                ));
                const invData = invoicesSnapshot.docs.map(doc => doc.data());
                setInvoices(invData);
            } catch (e) {
                console.warn("Invoices collection not found", e);
                setInvoices([]);
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
            <header className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                                <div style={{
                                    display: 'flex',
                                    background: '#f1f5f9',
                                    padding: '0.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                    gap: '0.125rem'
                                }}>
                                    {[
                                        { id: 'week', label: 'Tuần' },
                                        { id: 'month', label: 'Tháng' },
                                        { id: 'year', label: 'Năm' }
                                    ].map((range) => (
                                        <button
                                            key={range.id}
                                            onClick={() => setTimeRange(range.id)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                borderRadius: 'calc(var(--radius-md) - 4px)',
                                                border: 'none',
                                                background: timeRange === range.id ? 'white' : 'transparent',
                                                color: timeRange === range.id ? 'var(--primary)' : 'var(--text-muted)',
                                                fontWeight: '700',
                                                fontSize: '0.75rem',
                                                boxShadow: timeRange === range.id ? 'var(--shadow-sm)' : 'none',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {range.label}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                    Doanh thu (VNĐ)
                                </div>
                            </div>
                        </div>

                        {/* New Growth Metrics Section */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '1rem',
                            marginBottom: '2rem',
                            padding: '1.25rem',
                            background: '#f8fafc',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border)'
                        }}>
                            {growthMetrics.map((m, idx) => (
                                <div key={idx} style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                        Vs. {m.label} trc
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        color: m.isUp ? '#10b981' : m.isDown ? '#ef4444' : 'var(--text-muted)',
                                        fontWeight: '800',
                                        fontSize: '1.125rem'
                                    }}>
                                        {m.isUp && <TrendingUp size={16} />}
                                        {m.isDown && <TrendingDown size={16} />}
                                        {m.isNeutral && <Minus size={16} />}
                                        {m.percentage}%
                                    </div>
                                    <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        {m.current.toLocaleString('vi-VN')} ₫
                                    </p>
                                </div>
                            ))}
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
                                            tickFormatter={(value) => {
                                                if (value >= 1000000) return `${value / 1000000}M`;
                                                if (value >= 1000) return `${value / 1000}k`;
                                                return value;
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border)',
                                                boxShadow: 'var(--shadow-lg)',
                                                padding: '1rem'
                                            }}
                                            formatter={(value) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), "Doanh thu"]}
                                            labelStyle={{ fontWeight: 700, marginBottom: '0.25rem' }}
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
