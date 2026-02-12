import React from 'react';
import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const KPICard = ({ title, value, subtext, icon: Icon, color = 'blue', trend }) => {

    const styles = useMemo(() => {
        const variants = {
            blue: {
                bg: 'bg-indigo-50',
                text: 'text-indigo-600',
                border: 'border-indigo-100',
                shadow: 'shadow-indigo-100/50',
                iconBg: 'bg-white'
            },
            green: {
                bg: 'bg-emerald-50',
                text: 'text-emerald-600',
                border: 'border-emerald-100',
                shadow: 'shadow-emerald-100/50',
                iconBg: 'bg-white'
            },
            red: {
                bg: 'bg-rose-50',
                text: 'text-rose-600',
                border: 'border-rose-100',
                shadow: 'shadow-rose-100/50',
                iconBg: 'bg-white'
            },
            yellow: {
                bg: 'bg-amber-50',
                text: 'text-amber-600',
                border: 'border-amber-100',
                shadow: 'shadow-amber-100/50',
                iconBg: 'bg-white'
            },
            purple: {
                bg: 'bg-violet-50',
                text: 'text-violet-600',
                border: 'border-violet-100',
                shadow: 'shadow-violet-100/50',
                iconBg: 'bg-white'
            },
        };
        return variants[color] || variants.blue;
    }, [color]);

    const TrendIcon = trend?.isPositive ? ArrowUpRight : (trend?.isPositive === false ? ArrowDownRight : Minus);
    const trendColor = trend?.isPositive ? 'text-emerald-600 bg-emerald-50' : (trend?.isPositive === false ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-100');

    return (
        <div className="card-premium p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
            {/* Background Decoration */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.03] transition-transform group-hover:scale-150 duration-700 ${styles.bg.replace('bg-', 'bg-current text-')}`} />

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${styles.bg} ${styles.text} ${styles.border}`}>
                            {Icon && <Icon size={20} strokeWidth={2.5} />}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>

                        {(subtext || trend) && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {trend && (
                                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${trendColor}`}>
                                        <TrendIcon size={10} strokeWidth={3} />
                                        {trend.value}
                                    </span>
                                )}
                                {subtext && <span className="text-xs font-medium text-slate-400">{subtext}</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KPICard;
