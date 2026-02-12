import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import ContactoForm from '../components/Contactos/ContactoForm';

const ContactoFormPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (payload) => {
        setLoading(true);
        try {
            const response = await api.post('/contactos', payload);
            const newId = response.data.id || response.data.ContactoID;
            navigate(newId ? `/contactos/${newId}` : '/contactos');
        } catch (error) {
            alert(error.response?.data?.error || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="workspace-container pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(-1)}
                    aria-label={t('buttons.back')}
                    className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">{t('contacts.newTitle')}</h1>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{t('app.title')}</p>
                </div>
            </div>

            <ContactoForm
                onSubmit={handleSubmit}
                onCancel={() => navigate('/contactos')}
                loading={loading}
            />
        </div>
    );
};

export default ContactoFormPage;
