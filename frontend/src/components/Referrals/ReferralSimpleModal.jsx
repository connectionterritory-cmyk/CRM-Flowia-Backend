import { useState } from 'react';
import api from '../../services/api';

function ReferralSimpleModal({ ownerPersonId, ownerPersonType, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        nota: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!formData.nombre.trim()) {
            setError('Nombre es requerido');
            return;
        }
        if (!formData.telefono.trim()) {
            setError('Telefono es requerido');
            return;
        }

        setLoading(true);
        try {
            await api.post('/referrals', {
                owner_person_id: ownerPersonId,
                owner_person_type: ownerPersonType,
                nombre: formData.nombre.trim(),
                telefono: formData.telefono.trim(),
                nota: formData.nota.trim() || null,
                tipo: 'simple',
            });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo guardar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Agregar referido</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Referido simple</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">
                            {error}
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nombre</label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="input-field mt-2 h-11 px-4"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Telefono</label>
                        <input
                            type="text"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                            className="input-field mt-2 h-11 px-4"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Nota (opcional)</label>
                        <textarea
                            name="nota"
                            value={formData.nota}
                            onChange={handleChange}
                            className="input-field resize-none mt-2 h-12 px-4"
                            rows="3"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ReferralSimpleModal;
