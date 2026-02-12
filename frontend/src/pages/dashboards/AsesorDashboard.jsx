import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ShoppingBag, CalendarCheck, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AsesorDashboard = () => {
    const { t } = useTranslation();
    return (
        <div className="workspace-container animate-in fade-in slide-in-from-bottom-2 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">{t('pages.dashboardTitle')}</p>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter mt-2">{t('pages.advisorTitle')}</h2>
                    <p className="text-slate-500 font-medium mt-1">{t('pages.advisorSubtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/ordenes/new" className="btn-primary !py-2 !px-4 !rounded-xl">{t('dashboard.newOrder')}</Link>
                    <Link to="/clientes" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.customers')}</Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Users size={18} className="text-indigo-500" />
                        <p className="text-sm font-bold">{t('dashboard.activeProspects')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <CalendarCheck size={18} className="text-emerald-500" />
                        <p className="text-sm font-bold">{t('dashboard.scheduledDemos')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <ShoppingBag size={18} className="text-amber-500" />
                        <p className="text-sm font-bold">{t('dashboard.salesInProgress')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">0</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Target size={18} className="text-rose-500" />
                        <p className="text-sm font-bold">{t('dashboard.monthlyGoal')}</p>
                    </div>
                    <p className="text-3xl font-black text-slate-800 mt-4">$0</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                    <h3 className="text-lg font-black text-slate-800">{t('dashboard.priorityActions')}</h3>
                    <p className="text-sm text-slate-500 mt-1">{t('dashboard.focusDay')}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/pipeline" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.pipeline')}</Link>
                        <Link to="/programas" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.programs')}</Link>
                        <Link to="/ordenes" className="btn-secondary !py-2 !px-4 !rounded-xl">{t('buttons.sales')}</Link>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl border border-indigo-600 p-6 text-white">
                    <h3 className="text-2xl font-black">{t('app.title')}</h3>
                    <p className="text-sm text-indigo-100 mt-2">{t('dashboard.boostPrograms')}</p>
                    <Link to="/programas" className="inline-flex mt-5 bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold">{t('dashboard.explorePrograms')}</Link>
                </div>
            </div>
        </div>
    );
};

export default AsesorDashboard;
