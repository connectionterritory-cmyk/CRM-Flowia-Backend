import React from 'react';
import { AlertCircle, Bell, ChevronRight, UserPlus, FilePlus2, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const QuickAction = ({ icon: Icon, label, to, color = "indigo" }) => {
    const colors = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 hover:border-indigo-200 hover:shadow-indigo-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200 hover:shadow-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-200 hover:shadow-amber-100"
    };

    return (
        <Link
            to={to}
            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${colors[color]}`}
        >
            <Icon size={20} strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </Link>
    );
};

const AlertasWidget = ({ alertas = [] }) => {
    const { t } = useTranslation();
    return (
        <div className="h-full flex flex-col gap-6">
            {/* Quick Actions Section */}
            <div className="card-premium p-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('alerts.quickActions')}</h3>
                <div className="grid grid-cols-3 gap-3">
                    <QuickAction icon={UserPlus} label={t('alerts.newCustomer')} to="/clientes/nuevo" color="indigo" />
                    <QuickAction icon={FilePlus2} label={t('alerts.newOrder')} to="/ordenes" color="emerald" />
                    <QuickAction icon={Megaphone} label={t('alerts.campaign')} to="/marketing" color="amber" />
                </div>
            </div>

            {/* Alerts Section */}
            <div className="card-premium overflow-hidden flex-1 flex flex-col min-h-[300px]">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100">
                            <Bell size={16} strokeWidth={2.5} />
                        </div>
                        {t('alerts.title')}
                    </h3>
                    {alertas.length > 0 && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-black shadow-sm shadow-rose-200">
                            {alertas.length}
                        </span>
                    )}
                </div>

                <div className="divide-y divide-slate-50 overflow-y-auto custom-scrollbar flex-1">
                    {alertas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                                <AlertCircle size={24} />
                            </div>
                            <p className="text-slate-800 font-bold text-sm">{t('alerts.allClearTitle')}</p>
                            <p className="text-slate-400 text-xs mt-1">{t('alerts.allClearSubtitle')}</p>
                        </div>
                    ) : (
                        alertas.map((alerta, index) => (
                            <div key={index} className="p-5 flex items-start gap-4 hover:bg-slate-50/80 transition-colors group cursor-pointer border-l-2 border-transparent hover:border-indigo-500">
                                <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all ${alerta.tipo === 'mora' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    <AlertCircle size={14} strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-[10px] font-black tracking-widest uppercase ${alerta.tipo === 'mora' ? 'text-rose-500' : 'text-slate-400'}`}>
                                            {alerta.tipo === 'mora' ? t('alerts.critical') : t('alerts.info')}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium">{t('alerts.timeAgo', { time: '2h' })}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-snug font-bold mb-2">{alerta.mensaje}</p>
                                    <button
                                        onClick={() => window.location.href = `/clientes?alerta=${index}`}
                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group/btn"
                                    >
                                        {t('alerts.resolve')} <ChevronRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertasWidget;
