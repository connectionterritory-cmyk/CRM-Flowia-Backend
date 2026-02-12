import React, { useState } from 'react';
import api from '../../services/api';
import ClienteForm from '../Forms/ClienteForm';

const TabDetalles = ({ cliente, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData) => {
        setLoading(true);
        try {
            await api.put(`/clientes/${cliente.ClienteID}`, formData);
            if (onUpdate) onUpdate();
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating client:', error);
            alert('Error al actualizar cliente');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Información del Cliente</h3>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isEditing
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                >
                    {isEditing ? 'Cancelar' : 'Editar'}
                </button>
            </div>

            <ClienteForm
                initialData={cliente}
                onSubmit={handleSubmit}
                readOnly={!isEditing}
                loading={loading}
                onCancel={() => setIsEditing(false)}
            />
        </div>
    );
};

export default TabDetalles;
