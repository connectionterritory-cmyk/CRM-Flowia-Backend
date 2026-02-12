import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LogoMark from '../components/Brand/LogoMark';

const SetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const navigate = useNavigate();
    const { t } = useTranslation();

    if (!token) {
        return (
            <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-6">
                <div className="w-full max-w-md card-premium p-8 text-center">
                    <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24} />
                    </div>
                    <h2 className="text-xl font-black text-slate-800">Invitacion Invalida</h2>
                    <p className="text-sm text-slate-500 mt-2">No se encontró un token válido para activar tu cuenta.</p>
                    <button onClick={() => navigate('/login')} className="btn-primary mt-6 w-full justify-center">
                        Volver al Login
                    </button>
                </div>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/auth/accept-invite', { token, newPassword: password });
            toast.success('Cuenta activada. Ya puedes iniciar sesion');
            navigate('/login');
        } catch (error) {
            const msg = error.response?.data?.error || 'Error al activar la cuenta';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-6">
            <div className="w-full max-w-md card-premium p-8">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <LogoMark className="w-12 h-12" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('app.title')}</p>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter mt-2">Crear contraseña</h1>
                    <p className="text-sm text-slate-500 mt-2">Define tu contraseña para activar la cuenta</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Nueva Contraseña</label>
                        <div className="relative mt-2">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-workspace pr-10 h-11"
                                placeholder="••••••••"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Confirmar Contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="input-workspace mt-2 h-11"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center !mt-6"
                    >
                        {submitting ? 'Guardando...' : 'Activar Cuenta'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetPassword;
