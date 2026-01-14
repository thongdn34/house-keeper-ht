import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { Plus, Search, Edit2, Trash2, Filter, RotateCw, Banknote, X, Check } from 'lucide-react';

export default function RoomManagement({ user }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [billingRoom, setBillingRoom] = useState(null);
    const [billAmount, setBillAmount] = useState('');
    const [rentalDetails, setRentalDetails] = useState(null);
    const [daysCount, setDaysCount] = useState(0);

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "rooms"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const roomsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sắp xếp phòng theo tên để dễ theo dõi
            const sortedRooms = roomsData.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            setRooms(sortedRooms);
        } catch (error) {
            console.error("Error fetching rooms:", error);
            alert("Lỗi khi tải danh sách phòng: " + error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    const handleAddRoom = async () => {
        const name = prompt("Nhập tên phòng:");
        if (!name) return;

        const price = prompt("Nhập giá thuê phòng (VNĐ):", "2000000");
        if (price === null) return;

        try {
            const newRoom = {
                name,
                house: 'Nhà số 1',
                status: 'Còn trống',
                tenant: '-',
                price: parseInt(price) || 0,
                userId: user.uid
            };
            const docRef = await addDoc(collection(db, "rooms"), newRoom);
            setRooms(prev => [...prev, { id: docRef.id, ...newRoom }].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
        } catch (error) {
            console.error("Error adding room:", error);
            alert("Lỗi khi thêm phòng (Kiểm tra cấu hình Firebase)");
        }
    };

    const handleEditRoom = async (room) => {
        const newName = prompt("Nhập tên phòng mới:", room.name);
        if (newName === null) return; // Hủy bỏ

        const newHouse = prompt("Nhập địa chỉ nhà mới:", room.house);
        if (newHouse === null) return; // Hủy bỏ

        const newPrice = prompt("Nhập giá thuê mới (VNĐ):", room.price || "2000000");
        if (newPrice === null) return;

        if (newName === room.name && newHouse === room.house && parseInt(newPrice) === room.price) return;

        try {
            const roomRef = doc(db, "rooms", room.id);
            await updateDoc(roomRef, {
                name: newName || room.name,
                house: newHouse || room.house,
                price: parseInt(newPrice) || (room.price || 0)
            });

            setRooms(prev => prev.map(r =>
                r.id === room.id
                    ? { ...r, name: newName || r.name, house: newHouse || r.house, price: parseInt(newPrice) || (room.price || 0) }
                    : r
            ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
        } catch (error) {
            console.error("Error updating room:", error);
            alert("Lỗi khi cập nhật thông tin phòng");
        }
    };

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        const s = new Date(start);
        const e = new Date(end);

        // Calculate difference in calendar days
        // We set both to midnight to get exact calendar day difference
        const sMidnight = new Date(s);
        sMidnight.setHours(0, 0, 0, 0);
        const eMidnight = new Date(e);
        eMidnight.setHours(0, 0, 0, 0);

        const diffTime = eMidnight.getTime() - sMidnight.getTime();
        let diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // Adjust based on 14h and 12h rules
        const startHour = s.getHours();
        const endHour = e.getHours();

        // If check-in is before 14h, it counts as an extra day (using the previous day's block)
        if (startHour < 14) diffDays += 1;
        // If check-out is after 12h, it counts as an extra day (using the next day's block)
        if (endHour > 12) diffDays += 1;

        // If it's the same day and within the 14h-12h window (e.g., 14h-15h)
        // the calculation above might give 1 (0 + 0 + 1).
        // If it's same day 10h-11h, it gives 1 (0 + 1 + 0).
        // If it's same day 10h-15h, it gives 2 (0 + 1 + 1).

        return Math.max(1, diffDays);
    };

    const handleOpenBilling = async (room) => {
        setBillingRoom(room);
        setRentalDetails(null);
        setDaysCount(0);
        setBillAmount('...');

        try {
            const q = query(
                collection(db, "rentals"),
                where("roomId", "==", room.id),
                where("userId", "==", user.uid)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Sắp xếp thủ công trong JS để tránh yêu cầu tạo Index trên Firestore
                const rentals = querySnapshot.docs.map(doc => doc.data());
                rentals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

                const rental = rentals[0];
                setRentalDetails(rental);

                const days = calculateDays(rental.startDate, rental.endDate);
                setDaysCount(days);
                const total = (days * (room.price || 0)) - (rental.deposit || 0);
                setBillAmount(total.toString());
            } else {
                setBillAmount((room.price || 0).toString());
                setDaysCount(1);
            }
        } catch (error) {
            console.error("Error fetching rental details:", error);
            alert("Không thể tải thông tin thuê phòng. Vui lòng thử lại.");
            setBillAmount((room.price || 0).toString());
        }
    };

    const handleDeleteRoom = async (id) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
        try {
            await deleteDoc(doc(db, "rooms", id));
            setRooms(rooms.filter(room => room.id !== id));
        } catch (error) {
            console.error("Error deleting room:", error);
            alert("Lỗi khi xóa phòng");
        }
    };

    const handleBilling = async () => {
        if (!billingRoom || !billAmount) return;

        try {
            const amount = parseInt(billAmount);
            const now = new Date();
            const monthNames = ["Tháng 01", "Tháng 02", "Tháng 03", "Tháng 04", "Tháng 05", "Tháng 06", "Tháng 07", "Tháng 08", "Tháng 09", "Tháng 10", "Tháng 11", "Tháng 12"];
            const currentMonthName = monthNames[now.getMonth()];
            const order = now.getMonth() + 1;

            // 1. Save Invoice
            await addDoc(collection(db, "invoices"), {
                roomId: billingRoom.id,
                roomName: billingRoom.name,
                tenant: billingRoom.tenant,
                amount: amount,
                status: "Đã thanh toán",
                date: now.toISOString(),
                userId: user.uid
            });

            // 2. Update Revenue (Simpler for demo: check if month exists, if not create)
            const revQuery = query(collection(db, "revenue"), where("name", "==", currentMonthName), where("userId", "==", user.uid));
            const revSnapshot = await getDocs(revQuery);

            if (!revSnapshot.empty) {
                const revDoc = revSnapshot.docs[0];
                await updateDoc(doc(db, "revenue", revDoc.id), {
                    revenue: revDoc.data().revenue + amount
                });
            } else {
                await addDoc(collection(db, "revenue"), {
                    name: currentMonthName,
                    revenue: amount,
                    order: order,
                    userId: user.uid
                });
            }

            // 3. Update Room Status
            const roomRef = doc(db, "rooms", billingRoom.id);
            await updateDoc(roomRef, {
                status: "Còn trống",
                tenant: "-"
            });

            // 4. Local State Update
            setRooms(prev => prev.map(r =>
                r.id === billingRoom.id
                    ? { ...r, status: "Còn trống", tenant: "-" }
                    : r
            ));

            alert(`Đã thanh toán ${amount.toLocaleString('vi-VN')} VNĐ cho phòng ${billingRoom.name}. Trạng thái phòng đã chuyển sang Còn trống.`);
            setBillingRoom(null);
            setBillAmount('');
        } catch (error) {
            console.error("Error billing room:", error);
            alert("Lỗi khi thực hiện thanh toán");
        }
    };

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.house.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.tenant.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-container fade-in">
            <header className="page-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Quản lý phòng</h1>
                    <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Hệ thống quản lý {rooms.length} phòng đang vận hành</p>
                </div>
                <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn-secondary"
                        onClick={fetchRooms}
                        disabled={loading}
                        style={{ borderRadius: 'var(--radius-md)' }}
                    >
                        <RotateCw size={18} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                    <button className="btn-primary" onClick={handleAddRoom}>
                        <Plus size={20} /> Thêm phòng mới
                    </button>
                </div>
            </header>

            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem 2rem', display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', background: '#fffaf5', flexWrap: 'wrap' }}>
                    <div className="search-input-wrapper" style={{ flex: '1 1 300px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                    <button style={{ padding: '0.75rem 1.25rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'white', display: 'flex', alignItems: 'center', gap: '0.625rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        <Filter size={18} /> Lọc kết quả
                    </button>
                </div>

                <div className="table-container hide-on-mobile" style={{ border: 'none', borderRadius: '0', boxShadow: 'none' }}>
                    {loading && rooms.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RotateCw size={40} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem', opacity: 0.5 }} />
                            <p style={{ fontWeight: '500' }}>Đang tải danh sách phòng...</p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Thông tin phòng</th>
                                    <th>Khu vực / Nhà</th>
                                    <th>Giá thuê</th>
                                    <th>Trạng thái</th>
                                    <th>Khách thuê</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRooms.length > 0 ? filteredRooms.map((room) => (
                                    <tr key={room.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    background: 'var(--primary-light)',
                                                    color: 'var(--primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '0.75rem',
                                                    fontWeight: '800',
                                                    fontSize: '0.875rem'
                                                }}>
                                                    {room.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '700', fontSize: '1rem' }}>Phòng {room.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '500' }}>Mã phòng: {room.id.slice(0, 8).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--secondary)', opacity: 0.4 }}></span>
                                                {room.house}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600', color: 'var(--primary)' }}>
                                                {(room.price || 0).toLocaleString('vi-VN')} ₫
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${room.status === 'Còn trống' ? 'status-empty' : 'status-occupied'}`}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', marginRight: '0.5rem', display: 'inline-block' }}></span>
                                                {room.status}
                                            </span>
                                        </td>
                                        <td>
                                            {room.tenant === '-' ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontStyle: 'italic', opacity: 0.6 }}>Chưa có khách</span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                                        {room.tenant.charAt(0)}
                                                    </div>
                                                    {room.tenant}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                {room.status === 'Đang thuê' && (
                                                    <button
                                                        onClick={() => handleOpenBilling(room)}
                                                        style={{ padding: '0.625rem', borderRadius: '0.625rem', border: 'none', background: '#dcfce7', color: '#15803d', cursor: 'pointer' }}
                                                        title="Thanh toán"
                                                    >
                                                        <Banknote size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditRoom(room)}
                                                    style={{ padding: '0.625rem', borderRadius: '0.625rem', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer' }}
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    style={{ padding: '0.625rem', borderRadius: '0.625rem', border: 'none', background: '#ffe4e6', color: '#e11d48', cursor: 'pointer' }}
                                                    title="Xóa"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                                            <div style={{ opacity: 0.5, marginBottom: '1rem' }}>
                                                <Search size={48} style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                            <h4 style={{ fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.25rem' }}>Không tìm thấy kết quả</h4>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Chưa có phòng nào được đăng ký trong hệ thống'}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="room-card-list show-on-mobile">
                    {loading && filteredRooms.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RotateCw size={32} className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
                            <p>Đang tải...</p>
                        </div>
                    ) : filteredRooms.map((room) => (
                        <div key={room.id} className="room-card">
                            <div className="room-card-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '0.5rem',
                                        fontWeight: '800'
                                    }}>
                                        {room.name.charAt(0)}
                                    </div>
                                    <div style={{ fontWeight: '700' }}>Phòng {room.name}</div>
                                </div>
                                <span className={`status-badge ${room.status === 'Còn trống' ? 'status-empty' : 'status-occupied'}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem' }}>
                                    {room.status}
                                </span>
                            </div>
                            <div className="room-card-body">
                                <div className="room-card-info-row">
                                    <span className="room-card-info-label">Giá thuê:</span>
                                    <span className="room-card-info-value" style={{ color: 'var(--primary)' }}>{(room.price || 0).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                <div className="room-card-info-row">
                                    <span className="room-card-info-label">Địa chỉ:</span>
                                    <span className="room-card-info-value">{room.house}</span>
                                </div>
                                <div className="room-card-info-row">
                                    <span className="room-card-info-label">Khách thuê:</span>
                                    <span className="room-card-info-value">{room.tenant === '-' ? 'Chưa có' : room.tenant}</span>
                                </div>
                            </div>
                            <div className="room-card-footer">
                                {room.status === 'Đang thuê' && (
                                    <button
                                        onClick={() => handleOpenBilling(room)}
                                        style={{ flex: 1.5, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                    >
                                        <Banknote size={16} /> Tiền
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEditRoom(room)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', background: '#fffbeb', color: '#d97706', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Edit2 size={16} /> Sửa
                                </button>
                                <button
                                    onClick={() => handleDeleteRoom(room.id)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid #fecdd3', background: '#fff1f2', color: '#e11d48', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                >
                                    <Trash2 size={16} /> Xóa
                                </button>
                            </div>
                        </div>
                    ))}
                    {!loading && filteredRooms.length === 0 && (
                        <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                            <Search size={40} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '1rem' }} />
                            <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Không tìm thấy phòng phù hợp</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Billing Modal Overlay */}
            {billingRoom && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 200,
                    padding: '1rem'
                }}>
                    <div className="glass-card" style={{
                        width: '100%',
                        maxSize: '440px',
                        maxWidth: '440px',
                        padding: '2rem',
                        position: 'relative',
                        background: 'white'
                    }}>
                        <button
                            onClick={() => setBillingRoom(null)}
                            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                background: '#dcfce7',
                                color: '#15803d',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1rem'
                            }}>
                                <Banknote size={32} />
                            </div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Thu tiền phòng {billingRoom.name}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Khách thuê: <b>{billingRoom.tenant}</b></p>
                        </div>

                        {rentalDetails && (
                            <div style={{
                                background: '#f8fafc',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Thời gian thuê:</span>
                                    <span style={{ fontWeight: '600' }}>
                                        {new Date(rentalDetails.startDate).toLocaleDateString('vi-VN')} - {new Date(rentalDetails.endDate).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Số ngày (14h-12h):</span>
                                    <span style={{ fontWeight: '700' }}>{daysCount} ngày</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Đơn giá:</span>
                                    <span style={{ fontWeight: '600' }}>{(billingRoom.price || 0).toLocaleString('vi-VN')} ₫/ngày</span>
                                </div>
                                <div style={{ borderTop: '1px dashed #cbd5e1', margin: '0.5rem 0', paddingTop: '0.5rem' }}></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Thành tiền:</span>
                                    <span style={{ fontWeight: '600' }}>{(daysCount * (billingRoom.price || 0)).toLocaleString('vi-VN')} ₫</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e11d48' }}>
                                    <span>Tiền cọc đã trừ:</span>
                                    <span style={{ fontWeight: '700' }}>- {(rentalDetails.deposit || 0).toLocaleString('vi-VN')} ₫</span>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.5rem' }}>Tổng số tiền cần thu (VNĐ)</label>
                            <div className="search-input-wrapper">
                                <Banknote size={18} />
                                <input
                                    type="number"
                                    className="search-input"
                                    value={billAmount}
                                    onChange={(e) => setBillAmount(e.target.value)}
                                    placeholder="Nhập số tiền..."
                                    autoFocus
                                />
                            </div>
                            <p style={{ textAlign: 'right', marginTop: '0.5rem', fontWeight: '700', color: 'var(--primary)', fontSize: '1.25rem' }}>
                                {isNaN(parseInt(billAmount)) ? billAmount : parseInt(billAmount).toLocaleString('vi-VN')} ₫
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={() => setBillingRoom(null)}
                                className="btn-secondary"
                                style={{ flex: 1, padding: '0.875rem' }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleBilling}
                                className="btn-primary"
                                style={{ flex: 1, padding: '0.875rem' }}
                            >
                                <Check size={20} /> Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
