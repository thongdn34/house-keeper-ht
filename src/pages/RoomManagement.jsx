import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Plus, Search, Edit2, Trash2, Filter, RotateCw } from 'lucide-react';

export default function RoomManagement({ user }) {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

        try {
            const newRoom = {
                name,
                house: 'Nhà số 1',
                status: 'Còn trống',
                tenant: '-',
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

        if (newName === room.name && newHouse === room.house) return;

        try {
            const roomRef = doc(db, "rooms", room.id);
            await updateDoc(roomRef, {
                name: newName || room.name,
                house: newHouse || room.house
            });

            setRooms(prev => prev.map(r =>
                r.id === room.id
                    ? { ...r, name: newName || r.name, house: newHouse || r.house }
                    : r
            ).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
        } catch (error) {
            console.error("Error updating room:", error);
            alert("Lỗi khi cập nhật thông tin phòng");
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
                                    <th>Trạng thái</th>
                                    <th>Khách thuê hiện tại</th>
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
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                                <button
                                                    onClick={() => handleEditRoom(room)}
                                                    style={{ padding: '0.625rem', borderRadius: '0.625rem', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    title="Chỉnh sửa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    style={{ padding: '0.625rem', borderRadius: '0.625rem', border: 'none', background: '#ffe4e6', color: '#e11d48', cursor: 'pointer', transition: 'all 0.2s' }}
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
                                    <span className="room-card-info-label">Địa chỉ:</span>
                                    <span className="room-card-info-value">{room.house}</span>
                                </div>
                                <div className="room-card-info-row">
                                    <span className="room-card-info-label">Khách thuê:</span>
                                    <span className="room-card-info-value">{room.tenant === '-' ? 'Chưa có' : room.tenant}</span>
                                </div>
                            </div>
                            <div className="room-card-footer">
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
        </div>
    );
}
