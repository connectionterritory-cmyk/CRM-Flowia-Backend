import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import ClienteForm from '../components/Forms/ClienteForm';

const ClienteFormPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData) => {
        setLoading(true);
        try {
            const response = await api.post('/clientes', formData);
            // Assuming backend returns { id: ... } or the object
            // Redirect to detail page
            const newId = response.data.id || response.data.ClienteID;
            navigate(newId ? `/clientes/${newId}` : '/clientes');
        } catch (error) {
            console.error('Error creating client:', error);
            alert('Error al crear cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo Cliente</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <ClienteForm
                    initialData={{ TipoCliente: 'Residencial', Estado: 'Activo' }}
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(-1)}
                    loading={loading}
                />
            </div>
        </div>
    );
};

export default ClienteFormPage;
