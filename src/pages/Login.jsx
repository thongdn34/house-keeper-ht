import React from 'react';
import { auth, googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Home, LogIn } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            localStorage.setItem('loginTime', Date.now().toString());
            navigate('/');
        } catch (error) {
            console.error("Login failed:", error);
            // For demo purposes, we navigate anyway if firebase isn't configured
            if (error.code === 'auth/invalid-api-key') {
                alert("Firebase API Key is missing. Navigating to dashboard for demo (No actual login).");
                navigate('/');
            }
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        backgroundColor: 'var(--primary)',
                        padding: '1.25rem',
                        borderRadius: '1.5rem',
                        color: 'white',
                        boxShadow: '0 10px 20px -5px rgba(217, 119, 6, 0.4)'
                    }}>
                        <Home size={40} />
                    </div>
                </div>
                <h1 style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--secondary)', marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>Happy House</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontWeight: '500', fontSize: '1rem' }}>Hệ thống quản lý lưu trú thông minh</p>

                <div style={{ background: '#fff9eb', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid #fde68a', marginBottom: '2rem' }}>
                    <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '1rem' }}>Chào mừng bạn quay trở lại!</p>
                    <button className="btn-primary" style={{ width: '100%', fontSize: '1rem', height: '3.5rem' }} onClick={loginWithGoogle}>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="22" style={{ marginRight: '0.5rem' }} />
                        Kết nối bằng Google
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Hỗ trợ 24/7</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontWeight: '500' }}>
                    © 2024 Happy House Team. Version 2.0.0
                </p>
            </div>
        </div>
    );
}

