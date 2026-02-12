import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import NotasList from '../components/Notas/NotasList';

const NotasPage = () => {
    const { t } = useTranslation();
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchNotas = async () => {
        try {
            const response = await api.get('/notas'); // Global fetch
            setNotas(response.data);
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotas();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-blue-600">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('menu.internalNotes')}</h1>
                <p className="text-gray-500">{t('notes.subtitle')}</p>
            </div>

            <NotasList notes={notas} onUpdate={fetchNotas} />
        </div>
    );
};

export default NotasPage;
