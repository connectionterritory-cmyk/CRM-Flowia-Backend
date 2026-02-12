import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import api from '../services/api';
import OrdenesTable from '../components/Ordenes/OrdenesTable';

const OrdenesPage = ({ type }) => {
    const { t } = useTranslation();
    const [ordenes, setOrdenes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrdenes = async () => {
            try {
                const response = await api.get('/ordenes');
                setOrdenes(response.data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrdenes();
    }, []);

    return (
        <div className="workspace-container">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('menu.salesServices')}</h1>
                        <span className="badge badge-success">{t('orders.badge')}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{t('orders.subtitle')}</p>
                </div>
                <Link
                    to="/ordenes/new"
                    className="btn-primary !py-2.5 !px-6 shadow-indigo-600/10"
                >
                    <Plus size={18} className="mr-2" />
                    {t('orders.newOrder')}
                </Link>
            </div>

            <div className="animate-in fade-in duration-700">
                <OrdenesTable orders={ordenes} initialFilterType={type} loading={loading} />
            </div>
        </div>
    );
};

export default OrdenesPage;
