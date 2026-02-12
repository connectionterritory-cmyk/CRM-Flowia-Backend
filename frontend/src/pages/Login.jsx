import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';
import api from '../services/api';
import { getDefaultRouteForRole, getUserRole } from '../utils/roles';
import LogoMark from '../components/Brand/LogoMark';

const Login = () => {
    const [codigo, setCodigo] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Forgot Password State
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [sendingLink, setSendingLink] = useState(false);

    const { login, isAuthenticated, user } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';
    const fallbackRoute = useMemo(() => getDefaultRouteForRole(getUserRole(user)), [user]);

    useEffect(() => {
        if (isAuthenticated) {
            const target = from === '/' ? fallbackRoute : from;
            navigate(target, { replace: true });
        }
    }, [isAuthenticated, from, navigate, fallbackRoute]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!codigo || !password) {
            toast.error('Ingresa tu codigo o email y password');
            return;
        }

        setSubmitting(true);
        try {
            const response = await login({ codigo, password });
            toast.success('Bienvenido');
            const role = getUserRole(response?.user);
            const target = from === '/' ? getDefaultRouteForRole(role) : from;
            navigate(target, { replace: true });
        } catch (error) {
            const message = error.response?.data?.error || 'Credenciales invalidas';
            toast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleForgotPassword = (e) => {
        e.preventDefault();
        setShowForgotModal(true);
    };

    const handleSendResetLink = async (e) => {
        e.preventDefault();
        if (!forgotEmail) {
            toast.error('Ingresa tu email');
            return;
        }

        setSendingLink(true);
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            toast.success('Si el email es correcto, recibirás un enlace.');
            setShowForgotModal(false);
            setForgotEmail('');
        } catch (error) {
            console.error(error);
            toast.error('Error al solicitar restablecimiento');
        } finally {
            setSendingLink(false);
        }
    };

    return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center px-6 relative">
            <div className="w-full max-w-md card-premium p-8">
                <div className="mb-8 text-center">
                    <div className="flex justify-center mb-4">
                        <LogoMark className="w-12 h-12" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('app.title')}</p>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter mt-2">Iniciar sesion</h1>
                    <p className="text-sm text-slate-500 mt-2">Accede con tu codigo o email</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Codigo o email</label>
                        <input
                            type="text"
                            value={codigo}
                            onChange={(event) => setCodigo(event.target.value)}
                            className="input-workspace mt-2 h-11"
                            placeholder="codigo o correo"
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Password</label>
                        </div>
                        <div className="relative mt-2">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="input-workspace pr-10 h-11"
                                placeholder="••••••••"
                                autoComplete="current-password"
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

                    <div className="flex justify-end pt-1">
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center !mt-6"
                    >
                        {submitting ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Recuperar Contraseña</h3>
                            <button
                                onClick={() => setShowForgotModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">
                            Ingresa tu correo electrónico registrado. Te enviaremos un enlace para crear una nueva contraseña.
                        </p>
                        <form onSubmit={handleSendResetLink} className="space-y-6">
                            <input
                                type="email"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                className="input-workspace h-11"
                                placeholder="tu@email.com"
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForgotModal(false)}
                                    className="btn-secondary flex-1 justify-center"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={sendingLink}
                                    className="btn-primary flex-1 justify-center"
                                >
                                    {sendingLink ? 'Enviando...' : 'Enviar Enlace'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;
