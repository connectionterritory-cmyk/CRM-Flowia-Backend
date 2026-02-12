import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth.jsx';
import { useTranslation } from 'react-i18next';
import { getRoleLabelKey, getUserRole } from '../../utils/roles';

const Layout = () => {
    const location = useLocation();
    const { user } = useAuth();
    const { t } = useTranslation();
    const role = getUserRole(user);

    // Determine title based on path (Simple mapping for MVP)
    const getTitle = () => {
        if (location.pathname === '/') return `${t('pages.dashboardTitle')} · ${t(getRoleLabelKey(role))}`;
        if (location.pathname.startsWith('/dashboard')) return `${t('pages.dashboardTitle')} · ${t(getRoleLabelKey(role))}`;
        if (location.pathname.startsWith('/contactos')) return t('menu.contacts');
        if (location.pathname.startsWith('/pipeline')) return t('menu.opportunities');
        if (location.pathname.startsWith('/programas')) return t('menu.programs');
        if (location.pathname.startsWith('/clientes')) return t('menu.customers');
        if (location.pathname.startsWith('/ordenes') || location.pathname.startsWith('/servicios')) return t('menu.salesServices');
        if (location.pathname.startsWith('/notas')) return t('menu.internalNotes');
        if (location.pathname.startsWith('/equipo')) return t('menu.team');
        if (location.pathname.startsWith('/import')) return t('menu.import');
        if (location.pathname.startsWith('/settings')) return t('menu.settings');
        return t('app.title');
    };

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <div className="h-dvh bg-gray-50 flex flex-col md:flex-row overflow-hidden relative">
            {/* Sidebar (Desktop) */}
            <Sidebar collapsed={sidebarCollapsed} />

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-0 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <Header title={getTitle()} onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)} isSidebarCollapsed={sidebarCollapsed} />

                <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
                    <div className="absolute inset-0 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden pt-4 pb-20 md:pb-8">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Bottom Nav (Mobile) */}
            <MobileNav />
        </div>
    );
};

export default Layout;
