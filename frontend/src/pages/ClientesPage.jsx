import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import ClientesTable from '../components/Clientes/ClientesTable';

const ClientesPage = () => {
    const { t } = useTranslation();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const response = await api.get('/clientes');
                setClientes(response.data);
            } catch (error) {
                console.error('Error fetching clients:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchClientes();
    }, []);

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('menu.customers')}</h1>
                    <p className="text-gray-500">{t('customers.subtitle')}</p>
                </div>
            </div>

            <ClientesTable clients={clientes} loading={loading} />
        </div>
    );
};

export default ClientesPage;
