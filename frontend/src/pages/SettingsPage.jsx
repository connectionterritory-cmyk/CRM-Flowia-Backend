import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.jsx';

const SettingsPage = () => {
    const { t } = useTranslation();
    const { logout } = useAuth();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (loggingOut) {
            return;
        }

        setLoggingOut(true);
        try {
            await logout();
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <div className="workspace-container pb-20">
            <div className="mb-6">
                <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('pages.settingsTitle')}</h1>
                <p className="text-sm text-slate-500">{t('pages.settingsSubtitle')}</p>
            </div>

            <div className="card-premium p-6">
                <p className="text-sm text-slate-500">{t('pages.settingsBody')}</p>
            </div>

            <div className="card-premium p-6 mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold text-slate-700">{t('pages.settingsLogoutTitle')}</p>
                    <p className="text-sm text-slate-500">{t('pages.settingsLogoutDescription')}</p>
                </div>
                <button
                    type="button"
                    className="btn-secondary !py-2 !px-4 text-rose-600 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
                    onClick={handleLogout}
                    disabled={loggingOut}
                >
                    {loggingOut ? t('pages.settingsLogoutLoading') : t('buttons.logout')}
                </button>
            </div>
        </div>
    );
};

export default SettingsPage;
