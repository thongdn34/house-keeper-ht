import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User, Phone, Calendar, Banknote, FileText, Loader2 } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

const schema = yup.object({
    fullName: yup.string().required("Vui lòng nhập họ tên").min(3, "Họ tên phải ít nhất 3 ký tự"),
    phone: yup.string().required("Vui lòng nhập số điện thoại").matches(/^[0-9]+$/, "Số điện thoại chỉ được chứa số").min(10, "Số điện thoại phải có ít nhất 10 số"),
    roomId: yup.string().required("Vui lòng chọn phòng"),
    startDate: yup.string().required("Vui lòng chọn thời gian bắt đầu"),
    endDate: yup.string().required("Vui lòng chọn thời gian kết thúc"),
    deposit: yup.number().typeError("Tiền cọc phải là số").positive("Tiền cọc phải lớn hơn 0").required("Vui lòng nhập tiền cọc"),
    notes: yup.string()
}).required();

const formatCurrency = (amount) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function RentRoom() {
    const [rooms, setRooms] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    });

    const startDate = watch("startDate");
    const endDate = watch("endDate");
    const depositValue = watch("deposit");

    useEffect(() => {
        const fetchRooms = async () => {
            if (!startDate) {
                setRooms([]);
                return;
            }

            try {
                // For now, we fetch rooms with status "Còn trống". 
                // In a real app, we'd also check overlapping rentals between startDate and endDate.
                const q = query(collection(db, "rooms"), where("status", "==", "Còn trống"));
                const querySnapshot = await getDocs(q);
                const roomsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setRooms(roomsData);
            } catch (error) {
                console.error("Error fetching rooms:", error);
            }
        };
        fetchRooms();
    }, [startDate, endDate]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // 1. Lưu thông tin thuê phòng vào collection 'rentals'
            await addDoc(collection(db, "rentals"), {
                ...data,
                startDate: data.startDate,
                endDate: data.endDate,
                createdAt: new Date().toISOString()
            });

            // 2. Cập nhật trạng thái phòng thành 'Đang thuê'
            const roomRef = doc(db, "rooms", data.roomId);
            await updateDoc(roomRef, {
                status: "Đang thuê",
                tenant: data.fullName
            });

            alert("Đăng ký thuê phòng thành công!");
            reset();

            // Refresh danh sách phòng trống
            setRooms(rooms.filter(r => r.id !== data.roomId));
        } catch (error) {
            console.error("Error submitting rental:", error);
            alert("Đã xảy ra lỗi khi lưu dữ liệu. Vui lòng kiểm tra cấu hình Firebase.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container fade-in">
            <header style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.025em' }}>Đăng ký thuê phòng</h1>
                <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Điền thông tin khách hàng để thực hiện hợp đồng thuê mới</p>
            </header>

            <div className="card glass-card" style={{ maxWidth: '900px', padding: '2.5rem' }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Họ và tên khách hàng</label>
                            <div className="search-input-wrapper">
                                <User size={18} />
                                <input
                                    {...register("fullName")}
                                    className="search-input"
                                    style={{ borderColor: errors.fullName ? '#ef4444' : 'var(--border)', background: 'white' }}
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                />
                            </div>
                            {errors.fullName && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{errors.fullName.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Số điện thoại liên lạc</label>
                            <div className="search-input-wrapper">
                                <Phone size={18} />
                                <input
                                    {...register("phone")}
                                    className="search-input"
                                    style={{ borderColor: errors.phone ? '#ef4444' : 'var(--border)', background: 'white' }}
                                    placeholder="Ví dụ: 0901234567"
                                />
                            </div>
                            {errors.phone && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{errors.phone.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Thời gian bắt đầu</label>
                            <div className="search-input-wrapper">
                                <Calendar size={18} />
                                <input
                                    type="datetime-local"
                                    {...register("startDate")}
                                    className="search-input"
                                    style={{ borderColor: errors.startDate ? '#ef4444' : 'var(--border)', background: 'white' }}
                                />
                            </div>
                            {errors.startDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{errors.startDate.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Thời gian kết thúc</label>
                            <div className="search-input-wrapper">
                                <Calendar size={18} />
                                <input
                                    type="datetime-local"
                                    {...register("endDate")}
                                    className="search-input"
                                    style={{ borderColor: errors.endDate ? '#ef4444' : 'var(--border)', background: 'white' }}
                                />
                            </div>
                            {errors.endDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{errors.endDate.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Chọn phòng trống</label>
                            {startDate && endDate ? (
                                <div style={{ position: 'relative' }}>
                                    <select
                                        {...register("roomId")}
                                        className="search-input"
                                        style={{ borderColor: errors.roomId ? '#ef4444' : 'var(--border)', background: 'white', paddingLeft: '1rem' }}
                                    >
                                        <option value="">-- Danh sách phòng sẵn sàng --</option>
                                        {rooms.map(room => (
                                            <option key={room.id} value={room.id}>
                                                Phòng {room.name} - {room.house}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.roomId && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: '500' }}>{errors.roomId.message}</p>}
                                    {rooms.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', background: '#fff7ed', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #ffedd5' }}>⚠️ Xin lỗi, hiện không có phòng nào trống trong thời gian này.</p>}
                                </div>
                            ) : (
                                <div style={{ padding: '0.75rem 1rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                                    Vui lòng chọn ngày Bắt đầu & Kết thúc trước
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Tiền đặt cọc (VNĐ)</label>
                            <div className="search-input-wrapper">
                                <Banknote size={18} />
                                <input
                                    type="number"
                                    {...register("deposit")}
                                    className="search-input"
                                    style={{ borderColor: errors.deposit ? '#ef4444' : 'var(--border)', background: 'white' }}
                                    placeholder="Nhập số tiền..."
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.625rem' }}>
                                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '500' }}>Quy đổi nhanh:</span>
                                <span style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: '800' }}>{formatCurrency(depositValue)}</span>
                            </div>
                            {errors.deposit && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>{errors.deposit.message}</p>}
                        </div>

                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.625rem', color: 'var(--text-main)' }}>Ghi chú điều khoản</label>
                            <div className="search-input-wrapper" style={{ alignItems: 'flex-start' }}>
                                <FileText size={18} style={{ marginTop: '0.875rem' }} />
                                <textarea
                                    {...register("notes")}
                                    className="search-input"
                                    style={{ minHeight: '120px', paddingLeft: '2.75rem', background: 'white' }}
                                    placeholder="Nhập các thỏa thuận bổ sung hoặc ghi chú về khách hàng..."
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
                        <button
                            type="button"
                            onClick={() => reset()}
                            className="btn-secondary"
                            style={{ padding: '0.875rem 2rem' }}
                        >
                            Làm mới form
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ padding: '0.875rem 2.5rem' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin" size={20} /> Đang lưu thông tin...</>
                            ) : (
                                "Hoàn tất & Ký hợp đồng"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
