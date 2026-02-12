import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const parseLines = (text) => {
    if (!text) return [];
    return text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const parts = line.split('-').map((p) => p.trim());
            if (parts.length < 2) {
                const alt = line.split(',').map((p) => p.trim());
                return { nombre: alt[0], telefono: alt[1] };
            }
            return { nombre: parts[0], telefono: parts.slice(1).join('-') };
        });
};

function ProgramaVisitaModal({ oportunidad, programId, onClose, onUpdated }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [program, setProgram] = useState(null);
    const [bulk, setBulk] = useState('');
    const [programType, setProgramType] = useState('20_y_gana');
    const [whatsappText, setWhatsappText] = useState('');
    const [asesorTelefono, setAsesorTelefono] = useState('');

    const ownerPerson = useMemo(() => {
        if (oportunidad.ContactoID) return { type: 'CONTACTO', id: oportunidad.ContactoID };
        if (oportunidad.ClienteID) return { type: 'CLIENTE', id: oportunidad.ClienteID };
        return { type: null, id: null };
    }, [oportunidad]);

    useEffect(() => {
        const loadProgram = async () => {
            if (!programId) return;
            try {
                const response = await api.get(`/programs/${programId}`);
                setProgram(response.data.program);
            } catch (err) {
                console.error('Error cargando programa:', err);
            }
        };
        loadProgram();
    }, [programId]);

    const createProgram = async () => {
        setLoading(true);
        setError('');
        try {
            const referrals = parseLines(bulk);
            const response = await api.post('/programs', {
                opportunity_id: oportunidad.OportunidadID,
                program_type: programType,
                owner_person_type: ownerPerson.type,
                owner_person_id: ownerPerson.id,
                referrals,
            });
            setProgram(response.data);
            setBulk('');
            onUpdated?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo activar el programa');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkSubmit = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post(`/programs/${program.ProgramaVisitaID}/referrals/bulk`, {
                bulk,
            });
            const response = await api.get(`/programs/${program.ProgramaVisitaID}`);
            setProgram(response.data.program);
            setBulk('');
            onUpdated?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo procesar');
        } finally {
            setLoading(false);
        }
    };

    const handleWhatsappSent = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.patch(`/programs/${program.ProgramaVisitaID}`, {
                whatsapp_status: 'enviado',
            });
            setProgram(response.data);
            onUpdated?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo actualizar');
        } finally {
            setLoading(false);
        }
    };

    const handleReward = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.patch(`/programs/${program.ProgramaVisitaID}`, {
                reward_status: 'entregado',
            });
            setProgram(response.data);
            onUpdated?.();
        } catch (err) {
            setError(err.response?.data?.error || 'No se pudo actualizar');
        } finally {
            setLoading(false);
        }
    };

    const generateWhatsappText = () => {
        const clienteNombre = oportunidad.ContactoNombre || 'el cliente';
        const asesorNombre = oportunidad.OwnerNombre || 'tu asesor';
        const telefono = asesorTelefono || '[tu numero]';
        const text = `Hola ${clienteNombre}, gracias por recibirnos en casa. Si deseas mas informacion o agendar tu demo, contacta a ${asesorNombre} al ${telefono}.`;
        setWhatsappText(text);
    };

    const currentCount = program?.ReferidosCount || 0;
    const minRequired = program?.MinimoRequerido || (programType === '20_y_gana' ? 20 : 10);
    const isFourteen = (program?.TipoPrograma || programType) === '4_en_14';
    const canReward = currentCount >= minRequired && (!isFourteen ? program?.WhatsappStatus === 'enviado' : true);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-800">Programa de referidos</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Visita / Demostracion</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">
                            {error}
                        </div>
                    )}

                    {!program && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tipo de programa</label>
                                    <select
                                        value={programType}
                                        onChange={(event) => setProgramType(event.target.value)}
                                        className="input-field bg-white mt-2 h-11 px-4"
                                    >
                                        <option value="20_y_gana">20 y Gana</option>
                                        <option value="4_en_14">4 en 14</option>
                                    </select>
                                </div>
                                <div className="text-xs text-slate-500 font-semibold">
                                    {programType === '4_en_14'
                                        ? 'Requiere minimo 10 referidos para activar.'
                                        : 'Puedes activar y agregar referidos luego.'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Referidos (opcional)</label>
                                <textarea
                                    value={bulk}
                                    onChange={(event) => setBulk(event.target.value)}
                                    rows="6"
                                    className="input-field resize-none mt-2 h-12 px-4"
                                    placeholder="Juan Perez - 7865551234\nMaria Lopez - 3055552222"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={createProgram}
                                    disabled={loading}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    Activar programa
                                </button>
                            </div>
                        </div>
                    )}

                    {program && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Referidos</p>
                                    <p className="text-lg font-black text-slate-800">
                                        {currentCount} / {minRequired}
                                    </p>
                                    {program.FechaFin && (
                                        <p className="text-xs text-slate-500">Fecha fin: {program.FechaFin}</p>
                                    )}
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    {program.TipoPrograma === '20_y_gana' ? '20 y Gana' : '4 en 14'}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingreso rapido (copy/paste)</label>
                                <textarea
                                    value={bulk}
                                    onChange={(event) => setBulk(event.target.value)}
                                    rows="6"
                                    className="input-field resize-none mt-2 h-12 px-4"
                                    placeholder="Juan Perez - 7865551234\nMaria Lopez - 3055552222"
                                />
                                <div className="flex justify-end mt-3">
                                    <button
                                        type="button"
                                        onClick={handleBulkSubmit}
                                        disabled={loading}
                                        className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-60"
                                    >
                                        Procesar y crear referidos
                                    </button>
                                </div>
                            </div>

                            {program.TipoPrograma === '20_y_gana' && (
                                <div className="space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <input
                                        type="text"
                                        value={asesorTelefono}
                                        onChange={(event) => setAsesorTelefono(event.target.value)}
                                        placeholder="Telefono del asesor"
                                        className="input-field h-11 px-4"
                                    />
                                        <button
                                            type="button"
                                            onClick={generateWhatsappText}
                                            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                                        >
                                            Generar mensaje WhatsApp
                                        </button>
                                    </div>
                                    {whatsappText && (
                                        <textarea
                                            readOnly
                                            value={whatsappText}
                                            className="input-field resize-none h-12 px-4"
                                            rows="3"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleWhatsappSent}
                                        disabled={loading}
                                        className="px-4 py-2 rounded-xl border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50"
                                    >
                                        Marcar WhatsApp como enviado
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Estado regalo: {program.RewardStatus}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleReward}
                                    disabled={loading || !canReward}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    Marcar regalo entregado
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProgramaVisitaModal;
