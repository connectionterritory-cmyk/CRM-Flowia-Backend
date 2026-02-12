import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Upload, ShoppingBag, MessageSquare, BarChart2, Gift, Settings, MoreHorizontal, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const MobileNav = () => {
    const { t } = useTranslation();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);

    const primaryItems = useMemo(() => ([
        { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { path: '/programas', label: t('nav.programs'), icon: Gift },
        { path: '/contactos', label: t('nav.contacts'), icon: Users },
        { path: '/clientes', label: t('nav.customers'), icon: UserCheck },
        { path: '/pipeline', label: t('nav.opportunities'), icon: BarChart2 },
    ]), [t]);

    const secondaryItems = useMemo(() => ([
        { path: '/ordenes', label: t('nav.salesServices'), icon: ShoppingBag },
        { path: '/notas', label: t('nav.internalNotes'), icon: MessageSquare },
        { path: '/import', label: t('nav.import'), icon: Upload },
        { path: '/equipo', label: t('nav.team'), icon: Users },
        { path: '/settings', label: t('nav.settings'), icon: Settings },
    ]), [t]);

    const isMoreActive = secondaryItems.some((item) => location.pathname.startsWith(item.path));
    const handleMoreToggle = () => setShowMore((prev) => !prev);
    const handleCloseMore = () => setShowMore(false);

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 pb-safe">
            {showMore && (
                <div className="absolute inset-x-0 bottom-[70px] mx-3 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-2">
                    {secondaryItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={handleCloseMore}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`
                            }
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            )}
            <div className="flex items-center justify-between px-3 h-16">
                {primaryItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center h-full space-y-1 px-2 ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[9px] font-semibold uppercase tracking-wide">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
                <button
                    type="button"
                    onClick={handleMoreToggle}
                    className={`flex flex-col items-center justify-center h-full space-y-1 px-2 ${isMoreActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    aria-label={t('nav.more')}
                >
                    <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 2} />
                    <span className="text-[9px] font-semibold uppercase tracking-wide">{t('nav.more')}</span>
                </button>
            </div>
        </nav>
    );
};

export default MobileNav;
