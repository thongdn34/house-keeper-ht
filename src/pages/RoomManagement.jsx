import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Plus, Search, Edit2, Trash2, Filter, RotateCw } from 'lucide-react';

export default function RoomManagement() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, "rooms"));
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
                tenant: '-'
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
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Quản lý phòng</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Quản lý danh sách các phòng trong hệ thống</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        className="btn-secondary"
                        onClick={fetchRooms}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        disabled={loading}
                    >
                        <RotateCw size={20} className={loading ? 'animate-spin' : ''} /> Làm mới
                    </button>
                    <button className="btn-primary" onClick={handleAddRoom}>
                        <Plus size={20} /> Thêm phòng mới
                    </button>
                </div>
            </header>

            <div className="card" style={{ padding: '0' }}>
                <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên phòng, nhà hoặc người thuê..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.875rem' }}
                        />
                    </div>
                    <button style={{ padding: '0.5rem 1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                        <Filter size={18} /> Lọc
                    </button>
                </div>

                <div className="table-container" style={{ border: 'none', borderRadius: '0' }}>
                    {loading && rooms.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh sách phòng...</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Phòng</th>
                                    <th>Nhà</th>
                                    <th>Trạng thái</th>
                                    <th>Người thuê</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRooms.length > 0 ? filteredRooms.map((room) => (
                                    <tr key={room.id}>
                                        <td style={{ fontWeight: '600' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '32px', height: '32px', background: '#e0f2fe', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', fontSize: '10px' }}>
                                                    Phòng
                                                </div>
                                                <div>
                                                    <div>{room.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: #{room.id.slice(0, 8)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{room.house}</td>
                                        <td>
                                            <span className={`status-badge ${room.status === 'Còn trống' ? 'status-empty' : 'status-occupied'}`}>
                                                {room.status}
                                            </span>
                                        </td>
                                        <td style={{ color: room.tenant === '-' ? 'var(--text-muted)' : 'inherit' }}>{room.tenant}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleEditRoom(room)}
                                                    style={{ padding: '0.4rem', borderRadius: '0.4rem', border: 'none', background: '#fef3c7', color: '#d97706', cursor: 'pointer' }}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteRoom(room.id)}
                                                    style={{ padding: '0.4rem', borderRadius: '0.4rem', border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                            {searchTerm ? 'Không tìm thấy phòng nào phù hợp' : 'Chưa có phòng nào. Hãy thêm phòng mới!'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
