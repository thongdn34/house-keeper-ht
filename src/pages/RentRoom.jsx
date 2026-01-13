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
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '700' }}>Đăng ký thuê phòng</h1>
                <p style={{ color: 'var(--text-muted)' }}>Điền thông tin khách hàng để thực hiện hợp đồng thuê</p>
            </header>

            <div className="card" style={{ maxWidth: '800px' }}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Họ và tên</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    {...register("fullName")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: `1px solid ${errors.fullName ? '#ef4444' : 'var(--border)'}` }}
                                    placeholder="Nguyễn Văn A"
                                />
                            </div>
                            {errors.fullName && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.fullName.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Số điện thoại</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    {...register("phone")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: `1px solid ${errors.phone ? '#ef4444' : 'var(--border)'}` }}
                                    placeholder="0901234567"
                                />
                            </div>
                            {errors.phone && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.phone.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Thời gian bắt đầu</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="datetime-local"
                                    {...register("startDate")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: `1px solid ${errors.startDate ? '#ef4444' : 'var(--border)'}` }}
                                />
                            </div>
                            {errors.startDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.startDate.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Thời gian kết thúc</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="datetime-local"
                                    {...register("endDate")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: `1px solid ${errors.endDate ? '#ef4444' : 'var(--border)'}` }}
                                />
                            </div>
                            {errors.endDate && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.endDate.message}</p>}
                        </div>

                        {startDate && (
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Chọn phòng</label>
                                {startDate && endDate ? (
                                    <>
                                        <select
                                            {...register("roomId")}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: `1px solid ${errors.roomId ? '#ef4444' : 'var(--border)'}`, background: 'white' }}
                                        >
                                            <option value="">-- Chọn phòng trống --</option>
                                            {rooms.map(room => (
                                                <option key={room.id} value={room.id}>
                                                    Phòng {room.name} ({room.house})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.roomId && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.roomId.message}</p>}
                                        {rooms.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Không có phòng nào đang trống trong thời gian này.</p>}
                                    </>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Vui lòng chọn thời gian kết thúc để xem danh sách phòng.</p>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Tiền cọc</label>
                            <div style={{ position: 'relative' }}>
                                <Banknote size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="number"
                                    {...register("deposit")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: `1px solid ${errors.deposit ? '#ef4444' : 'var(--border)'}` }}
                                    placeholder="2,000,000"
                                />
                            </div>
                            <p style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600', marginTop: '0.5rem' }}>
                                Định dạng: {formatCurrency(depositValue)}
                            </p>
                            {errors.deposit && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.deposit.message}</p>}
                        </div>

                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Ghi chú</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                                <textarea
                                    {...register("notes")}
                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', minHeight: '100px' }}
                                    placeholder="Thông tin thêm..."
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button type="button" onClick={() => reset()} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'white' }}>Hủy</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Đang xử lý...</> : "Xác nhận thuê phòng"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
