import React, { useState, useEffect } from 'react';

const ClienteForm = ({ initialData, onSubmit, loading, readOnly = false, onCancel }) => {
    const [formData, setFormData] = useState(initialData || {});

    useEffect(() => {
        setFormData(initialData || {});
    }, [initialData]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.Ciudad) {
            alert('Ciudad es obligatoria');
            return;
        }

        if (!formData.EstadoProvincia) {
            alert('Estado/Provincia es obligatorio');
            return;
        }

        const paisValue = formData.Pais || 'USA';
        if (paisValue === 'USA' && !formData.Zipcode) {
            alert('ZIP Code es obligatorio para USA');
            return;
        }

        onSubmit({
            ...formData,
            Pais: paisValue
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Nombre Completo</label>
                    <input
                        type="text"
                        name="Nombre"
                        value={formData.Nombre || ''}
                        onChange={handleChange}
                        disabled={readOnly}
                        required
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Teléfono</label>
                    <input
                        type="tel"
                        name="Telefono"
                        value={formData.Telefono || ''}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                    <input
                        type="email"
                        name="Email"
                        value={formData.Email || ''}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Tipo de Cliente</label>
                    <select
                        name="TipoCliente"
                        value={formData.TipoCliente || 'Residencial'}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value="Residencial">Residencial</option>
                        <option value="Comercial">Comercial</option>
                        <option value="Corporativo">Corporativo</option>
                    </select>
                </div>
            </div>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Dirección</label>
                    <input
                        type="text"
                        name="Direccion"
                        value={formData.Direccion || ''}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Ciudad</label>
                    <input
                        type="text"
                        name="Ciudad"
                        required
                        value={formData.Ciudad || ''}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Estado/Provincia</label>
                        <input
                            type="text"
                            name="EstadoProvincia"
                            required
                            value={formData.EstadoProvincia || ''}
                            onChange={handleChange}
                            disabled={readOnly}
                            className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">ZIP Code</label>
                        <input
                            type="text"
                            name="Zipcode"
                            value={formData.Zipcode || ''}
                            onChange={handleChange}
                            disabled={readOnly}
                            required={(formData.Pais || 'USA') === 'USA'}
                            className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">País</label>
                    <input
                        type="text"
                        name="Pais"
                        value={formData.Pais || 'USA'}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                    <select
                        name="Estado"
                        value={formData.Estado || 'Activo'}
                        onChange={handleChange}
                        disabled={readOnly}
                        className="w-full h-11 px-4 mt-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500"
                    >
                        <option value="Activo">Activo</option>
                        <option value="Inactivo">Inactivo</option>
                        <option value="Moroso">Moroso</option>
                    </select>
                </div>
            </div>

            <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Notas Internas</label>
                <textarea
                    name="Notas"
                    value={formData.Notas || ''}
                    onChange={handleChange}
                    disabled={readOnly}
                    rows="3"
                    className="w-full h-12 px-4 mt-2 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-500 rounded-lg"
                ></textarea>
            </div>

            {!readOnly && (
                <div className="lg:col-span-2 flex justify-end gap-3 mt-4">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cliente'}
                    </button>
                </div>
            )}
        </form>
    );
};

export default ClienteForm;
