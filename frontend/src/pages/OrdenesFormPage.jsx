import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrdenForm from '../components/Forms/OrdenForm';

const OrdenesFormPage = () => {
    const navigate = useNavigate();

    const handleSuccess = () => {
        navigate('/ordenes');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Nueva Orden</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <OrdenForm
                    onSuccess={handleSuccess}
                    onCancel={() => navigate(-1)}
                />
            </div>
        </div>
    );
};

export default OrdenesFormPage;
