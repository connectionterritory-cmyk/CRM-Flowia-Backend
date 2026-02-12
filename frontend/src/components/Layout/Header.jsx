import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Search, Menu, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getRoleLabelKey, getUserRole } from '../../utils/roles';

const Header = ({ title, onToggleSidebar, isSidebarCollapsed }) => {
    const { user, logout } = useAuth();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const role = getUserRole(user);
    const displayName = user?.name || user?.Nombre || t('roles.user');
    const handleLanguageChange = (event) => {
        const lang = event.target.value;
        i18n.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
    };
    const currentLanguage = i18n.resolvedLanguage || i18n.language || 'es';
    const initials = useMemo(() => {
        const parts = displayName.trim().split(' ').filter(Boolean);
        if (parts.length === 0) return 'U';
        const first = parts[0][0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return `${first}${last}`.toUpperCase();
    }, [displayName]);

    useEffect(() => {
        if (!isUserMenuOpen) {
            return;
        }

        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
                setIsUserMenuOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isUserMenuOpen]);

    const handleUserMenuToggle = () => {
        setIsUserMenuOpen((prev) => !prev);
    };

    const handleLogout = async () => {
        setIsUserMenuOpen(false);
        await logout();
        navigate('/login');
    };
    return (
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 md:px-12">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-2xl">
                <button
                    onClick={onToggleSidebar}
                    className="hidden md:flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all"
                    aria-label={isSidebarCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
                >
                    <Menu size={18} />
                </button>
                <span className="hidden lg:inline-flex text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                    {t('app.title')}
                </span>
                <div className="relative group w-full hidden sm:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full bg-slate-100/50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-sans text-[10px] font-medium text-slate-400 opacity-100 shadow-sm">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 ml-4 sm:ml-8">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        aria-label={t('common.search')}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all sm:hidden"
                    >
                        <Search size={18} />
                    </button>
                    <Link
                        to="/notas"
                        aria-label={t('nav.internalNotes')}
                        className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative"
                    >
                        <Bell size={20} />
                        <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
                    </Link>
                    <Link
                        to="/settings"
                        aria-label={t('nav.settings')}
                        className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    >
                        <Settings size={20} />
                    </Link>
                </div>

                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                <div className="relative" ref={userMenuRef}>
                    <button
                        type="button"
                        onClick={handleUserMenuToggle}
                        aria-haspopup="menu"
                        aria-expanded={isUserMenuOpen}
                        className="flex items-center gap-2 sm:gap-3.5 pl-1 sm:pl-2 cursor-pointer group"
                    >
                        <div className="text-right hidden lg:block leading-tight">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{displayName}</p>
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{t(getRoleLabelKey(role))}</p>
                        </div>
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-all">
                            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-indigo-600 font-black text-sm">
                                {initials}
                            </div>
                        </div>
                    </button>
                    {isUserMenuOpen && (
                        <div
                            role="menu"
                            className="absolute right-0 mt-3 w-48 rounded-2xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-200/40"
                        >
                            <Link
                                to="/settings"
                                role="menuitem"
                                className="flex w-full items-center px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                onClick={() => setIsUserMenuOpen(false)}
                            >
                                {t('header.profile')}
                            </Link>
                            <button
                                type="button"
                                role="menuitem"
                                className="flex w-full items-center px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                onClick={handleLogout}
                            >
                                {t('buttons.logout')}
                            </button>
                        </div>
                    )}
                </div>
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('common.language')}</span>
                    <select
                        value={currentLanguage}
                        onChange={handleLanguageChange}
                        className="bg-white text-[10px] font-black text-slate-700 rounded-lg px-2 py-1 border border-slate-200"
                    >
                        <option value="es">ES</option>
                        <option value="en">EN</option>
                        <option value="pt">PT</option>
                    </select>
                </div>
            </div>
        </header>
    );
};

export default Header;
