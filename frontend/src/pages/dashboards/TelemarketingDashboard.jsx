import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Users, BarChart2, Gift } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TelemarketingDashboard = () => {
    const { t } = useTranslation();
    return (
        <div className="workspace-container animate-in fade-in slide-in-from-bottom-2 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('pages.dashboardTitle')}</p>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter mt-2">{t('pages.telemarketingTitle')}</h2>
                    <p className="text-slate-500 font-medium mt-1">{t('pages.telemarketingSubtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/contactos" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.contacts')}</Link>
                    <Link to="/pipeline" className="btn-primary !py-2 !px-4 !rounded-xl">{t('buttons.pipeline')}</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <PhoneCall size={18} className="text-indigo-500" />
                        <p className="text-sm font-bold">{t('dashboard.callsToday')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                    <p className="text-xs text-slate-400 mt-1">{t('dashboard.firstContact')}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Users size={18} className="text-emerald-500" />
                        <p className="text-sm font-bold">{t('dashboard.activeProspects')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                    <p className="text-xs text-slate-400 mt-1">{t('dashboard.unconverted')}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <BarChart2 size={18} className="text-amber-500" />
                        <p className="text-sm font-bold">{t('dashboard.followUps')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                    <p className="text-xs text-slate-400 mt-1">{t('dashboard.pendingToday')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-lg font-black text-slate-800">{t('dashboard.quickActions')}</h3>
                    <p className="text-sm text-slate-500 mt-1">{t('dashboard.optimize')}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/contactos" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.contacts')}</Link>
                        <Link to="/pipeline" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.pipeline')}</Link>
                        <Link to="/programas" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.programs')}</Link>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-800 p-6 text-white">
                    <div className="flex items-center gap-3 text-slate-200">
                        <Gift size={18} />
                        <p className="text-sm font-bold">{t('dashboard.royalReferrals')}</p>
                    </div>
                    <h3 className="text-2xl font-black mt-4">{t('dashboard.activatePrograms')}</h3>
                    <p className="text-sm text-slate-300 mt-2">{t('dashboard.promotePrograms')}</p>
                    <Link to="/programas" className="inline-flex mt-5 btn-primary !py-2 !px-4 !rounded-xl">{t('buttons.programs')}</Link>
                </div>
            </div>
        </div>
    );
};

export default TelemarketingDashboard;
