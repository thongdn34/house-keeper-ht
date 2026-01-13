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
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div style={{ backgroundColor: 'var(--primary)', padding: '1rem', borderRadius: '1rem', color: 'white' }}>
                        <Home size={32} />
                    </div>
                </div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Happy House</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Hệ thống quản lý phòng trọ</p>

                <button className="btn-primary" style={{ width: '100%' }} onClick={loginWithGoogle}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" />
                    Đăng nhập bằng Gmail
                </button>

                <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    © 2024 Happy House. All rights reserved.
                </p>
            </div>
        </div>
    );
}
