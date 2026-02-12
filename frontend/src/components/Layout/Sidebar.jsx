import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, Settings, ShoppingBag, MessageSquare, BarChart2, Gift, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useTerminology } from '../../hooks/useTerminology';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getUserRole } from '../../utils/roles';
import LogoMark from '../Brand/LogoMark';

const Sidebar = ({ collapsed = false }) => {
    const [notesCount, setNotesCount] = useState(0);
    const [openMenuPath, setOpenMenuPath] = useState(null);
    const { t } = useTranslation();
    const { termPlural } = useTerminology();
    const { user } = useAuth();
    const role = getUserRole(user);
    const location = useLocation();

    useEffect(() => {
        const loadCounts = async () => {
            try {
                const response = await api.get('/dashboard/stats');
                setNotesCount(response.data?.notasNoLeidas || 0);
            } catch (error) {
                setNotesCount(0);
            }
        };
        loadCounts();
    }, []);


    const navItems = useMemo(() => ([
        {
            path: '/dashboard',
            label: t('nav.dashboard'),
            description: t('navDesc.dashboard', { defaultValue: '' }),
            icon: LayoutDashboard
        },
        {
            path: '/contactos',
            label: termPlural('contact'),
            description: t('navDesc.contacts', { defaultValue: '' }),
            icon: Users
        },
        {
            path: '/pipeline',
            label: termPlural('opportunity'),
            description: t('navDesc.opportunities', { defaultValue: '' }),
            icon: BarChart2
        },
        {
            path: '/programas',
            label: termPlural('program'),
            description: t('navDesc.programs', { defaultValue: '' }),
            icon: Gift,
            children: [
                { path: '/programas?tipo=4_EN_14', label: '4 en 14' },
                { path: '/programas?tipo=20_Y_GANA', label: '20 y Gana' },
                { path: '/programas?tipo=REFERIDO_SIMPLE', label: 'Referidos' }
            ]
        },
        {
            path: '/clientes',
            label: termPlural('customer'),
            description: t('navDesc.customers', { defaultValue: '' }),
            icon: Users
        },
        {
            path: '/ordenes',
            label: `${termPlural('order')} / ${termPlural('service')}`,
            description: t('navDesc.salesServices', { defaultValue: '' }),
            icon: ShoppingBag
        },
        {
            path: '/import',
            label: t('nav.import'),
            description: t('navDesc.import', { defaultValue: '' }),
            icon: Upload
        },
        {
            path: '/notas',
            label: t('nav.internalNotes'),
            description: t('navDesc.internalNotes', { defaultValue: '' }),
            icon: MessageSquare,
            badge: notesCount
        },
        {
            path: '/equipo',
            label: t('nav.team'),
            description: t('navDesc.team', { defaultValue: '' }),
            icon: UserRound,
            roles: ['ADMIN', 'DISTRIBUIDOR']
        },
        {
            path: '/settings',
            label: t('nav.settings'),
            description: t('navDesc.settings', { defaultValue: '' }),
            icon: Settings
        }
    ]), [t, termPlural]);

    const visibleItems = navItems.filter((item) => {
        if (!item.roles) return true;
        return item.roles.includes(role);
    });


    return (
        <div className={`hidden md:flex flex-col ${collapsed ? 'w-20' : 'w-64'} bg-slate-900 h-dvh fixed left-0 top-0 text-slate-400 z-50 overflow-hidden shadow-2xl transition-all duration-300`}>
            {/* Logo Area */}
            <div className={`h-20 flex items-center ${collapsed ? 'px-4 justify-center' : 'px-8'} border-b border-slate-800/50 flex-shrink-0`}>
                <div className="flex items-center gap-3">
                    <LogoMark className="w-9 h-9" />
                    {!collapsed && (
                        <div>
                            <span className="text-white font-black text-lg tracking-tighter uppercase leading-none block">{t('app.brand')}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] leading-none mt-1 block">{t('app.tagline')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 ${collapsed ? 'px-3' : 'px-4'} py-8 space-y-1 overflow-y-auto custom-scrollbar`}>
                {visibleItems.map((item) => (
                    <div key={item.path} className="mb-1.5">
                        <NavLink
                            to={item.path}
                            onClick={() => {
                                if (item.children?.length && !collapsed) {
                                    setOpenMenuPath((prev) => (prev === item.path ? null : item.path));
                                } else if (!item.children?.length) {
                                    setOpenMenuPath(null);
                                }
                            }}
                            className={({ isActive }) =>
                                `flex items-center ${collapsed ? 'justify-center px-3' : 'px-4'} py-3.5 rounded-xl transition-all duration-300 group relative ${isActive
                                    ? 'bg-indigo-600/10 text-white font-bold'
                                    : 'hover:bg-slate-800/40 hover:text-slate-200'
                                }`
                            }
                            title={item.description ? `${item.label} — ${item.description}` : item.label}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                                    )}
                                    <item.icon
                                        size={18}
                                        className={`${collapsed ? 'mr-0' : 'mr-4'} transition-all duration-300 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {!collapsed && (
                                        <div className="flex flex-col">
                                            <span className="text-sm tracking-tight">{item.label}</span>
                                            {item.description && (
                                                <span className="text-[10px] text-slate-500 font-medium mt-0.5">{item.description}</span>
                                            )}
                                        </div>
                                    )}
                                    {!collapsed && item.badge > 0 && (
                                        <span className="ml-auto inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200">
                                            {item.badge}
                                        </span>
                                    )}
                                    {collapsed && item.badge > 0 && (
                                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-400"></span>
                                    )}
                                </>
                            )}
                        </NavLink>
                        {!collapsed && item.children?.length > 0 && openMenuPath === item.path && (
                            <div className="ml-10 mt-2 space-y-1 rounded-2xl border border-slate-800/40 bg-slate-900/40 p-2">
                                {item.children.map((child) => (
                                    <NavLink
                                        key={child.path}
                                        to={child.path}
                                        className={({ isActive }) =>
                                            `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold tracking-tight transition-all ${isActive
                                                ? 'text-white bg-indigo-500/20 border border-indigo-500/30'
                                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                            }`
                                        }
                                    >
                                        <span>{child.label}</span>
                                        <span className="text-[10px] text-slate-500">→</span>
                                    </NavLink>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className={`p-6 border-t border-slate-800/50 mt-auto flex-shrink-0 ${collapsed ? 'px-3' : 'px-6'}`}>
                <NavLink
                    to="/notas"
                    className={({ isActive }) =>
                        `w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl shadow-xl shadow-indigo-600/10 ${collapsed ? 'px-0' : ''}`
                    }
                >
                    <MessageSquare size={16} />
                    {!collapsed && <span>{t('buttons.createNote')}</span>}
                </NavLink>
            </div>
        </div>
    );
};

export default Sidebar;
