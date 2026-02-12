import React, { useState } from 'react';

const EstadoCierreModal = ({ estado, oportunidad, onCancel, onSubmit }) => {
    const [proximoContactoFecha, setProximoContactoFecha] = useState('');
    const [motivoNoInteresado, setMotivoNoInteresado] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');

        if (estado === 'Seguimiento' && !proximoContactoFecha) {
            setError('Ingresa la fecha del proximo contacto.');
            return;
        }

        if (estado === 'No interesado' && !motivoNoInteresado) {
            setError('Ingresa el motivo.');
            return;
        }

        onSubmit({ proximoContactoFecha, motivoNoInteresado });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800">Actualizar estado</h3>
                    <p className="text-sm text-slate-500 mt-1">{oportunidad?.ContactoNombre}</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {estado === 'Seguimiento' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Proximo contacto
                            </label>
                            <input
                                type="datetime-local"
                                value={proximoContactoFecha}
                                onChange={(event) => setProximoContactoFecha(event.target.value)}
                                className="input-workspace mt-2 h-11"
                                required
                            />
                        </div>
                    )}

                    {estado === 'No interesado' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Motivo
                            </label>
                            <textarea
                                value={motivoNoInteresado}
                                onChange={(event) => setMotivoNoInteresado(event.target.value)}
                                className="input-workspace resize-none mt-2 h-12 px-4"
                                rows="3"
                                required
                            />
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EstadoCierreModal;
