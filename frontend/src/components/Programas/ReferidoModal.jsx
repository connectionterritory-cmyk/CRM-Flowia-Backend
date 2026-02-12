import React, { useState } from 'react';

const ReferidoModal = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        ciudad: '',
        estadoCivil: '',
        mejorHoraContacto: '',
        trabajaActualmente: ''
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800">Agregar referido</h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
                        <input
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="input-field mt-2 h-11 px-4"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                        <input
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                            className="input-field mt-2 h-11 px-4"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Ciudad</label>
                        <input
                            name="ciudad"
                            value={formData.ciudad}
                            onChange={handleChange}
                            className="input-field mt-2 h-11 px-4"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado civil</label>
                        <select
                            name="estadoCivil"
                            value={formData.estadoCivil}
                            onChange={handleChange}
                            className="input-field bg-white mt-2 h-11 px-4"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Soltero">Soltero</option>
                            <option value="Casado">Casado</option>
                            <option value="Union libre">Unión libre</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mejor hora de contacto</label>
                        <select
                            name="mejorHoraContacto"
                            value={formData.mejorHoraContacto}
                            onChange={handleChange}
                            className="input-field bg-white mt-2 h-11 px-4"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Manana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                            <option value="Noche">Noche</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Trabaja actualmente</label>
                        <select
                            name="trabajaActualmente"
                            value={formData.trabajaActualmente}
                            onChange={handleChange}
                            className="input-field bg-white mt-2 h-11 px-4"
                        >
                            <option value="">Seleccionar...</option>
                            <option value="Si">Sí</option>
                            <option value="No">No</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            Cancelar
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReferidoModal;
