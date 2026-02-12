import { useEffect, useState } from 'react';
import { FileText, UploadCloud, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const normalizePhoneDigits = (value) => {
    if (!value) return '';
    const digits = String(value).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
    return digits;
};

const buildPhone = (raw) => {
    const digits = normalizePhoneDigits(raw);
    const isValid = digits.length === 10;
    return {
        digits,
        e164: isValid ? `+1${digits}` : null,
        isValid
    };
};

const parseRawText = (rawText) => {
    const lines = String(rawText || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    const parsed = [];
    let pendingName = '';

    const parseLine = (line) => {
        const nameMatch = line.match(/^nombre\s*:\s*(.+)$/i);
        if (nameMatch) {
            pendingName = nameMatch[1].trim();
            return null;
        }

        const phoneLabelMatch = line.match(/^(tel[eé]fono|telefono)\s*:\s*(.+)$/i);
        if (phoneLabelMatch) {
            const phoneRaw = phoneLabelMatch[2].trim();
            const name = pendingName || '';
            pendingName = '';
            return { name, phone: phoneRaw };
        }

        const phoneMatch = line.match(/(?:\+?1[\s().-]*)?\d[\d\s().-]{6,}\d/);
        if (phoneMatch) {
            const phoneRaw = phoneMatch[0].trim();
            const name = line.replace(phoneRaw, '').replace(/[-,;|\t]+$/g, '').trim();
            return { name, phone: phoneRaw };
        }

        const parts = line.split(/[\t,;|]/).map((part) => part.trim()).filter(Boolean);
        if (parts.length >= 2) {
            return { name: parts[0], phone: parts.slice(1).join(' ') };
        }

        const dashParts = line.split('-').map((part) => part.trim()).filter(Boolean);
        if (dashParts.length >= 2) {
            return { name: dashParts[0], phone: dashParts.slice(1).join('-') };
        }

        return { name: line, phone: '' };
    };

    lines.forEach((line) => {
        const item = parseLine(line);
        if (item) parsed.push(item);
    });

    if (pendingName) {
        parsed.push({ name: pendingName, phone: '' });
    }

    return parsed;
};

const parseFileText = (text) => {
    const lines = String(text || '')
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

    if (!lines.length) return [];

    const header = lines[0].toLowerCase();
    const hasHeader = header.includes('nombre') || header.includes('name');
    const body = hasHeader ? lines.slice(1) : lines;

    const rows = [];
    body.forEach((line) => {
        const columns = line.split(/[\t,;|]/).map((part) => part.trim()).filter(Boolean);
        if (columns.length >= 2) {
            rows.push({ name: columns[0], phone: columns.slice(1).join(' ') });
            return;
        }
        parseRawText(line).forEach((item) => rows.push(item));
    });

    return rows;
};

const buildPreviewItems = (entries, existingPhones) => {
    const seen = new Set();
    return entries.map((entry) => {
        const name = entry?.name?.trim() || 'Sin nombre';
        const phoneRaw = entry?.phone || '';
        const phone = buildPhone(phoneRaw);
        const isDuplicate = phone.isValid && (existingPhones.has(phone.digits) || seen.has(phone.digits));
        const note = !phone.isValid ? 'Telefono invalido' : isDuplicate ? 'Duplicado' : '';
        if (phone.isValid) {
            seen.add(phone.digits);
        }
        return {
            name,
            phoneRaw,
            phoneDigits: phone.digits,
            phoneE164: phone.e164,
            isValid: phone.isValid,
            isDuplicate,
            note
        };
    });
};

const ProspectImportModal = ({ isOpen, onClose, existingPhones = new Set(), onImported }) => {
    const [tab, setTab] = useState('paste');
    const [rawText, setRawText] = useState('');
    const [fileText, setFileText] = useState('');
    const [fileName, setFileName] = useState('');
    const [previewItems, setPreviewItems] = useState([]);
    const [omitDuplicates, setOmitDuplicates] = useState(true);
    const [previewed, setPreviewed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [ocrText, setOcrText] = useState('');
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrFileName, setOcrFileName] = useState('');
    const [ocrFile, setOcrFile] = useState(null);

    useEffect(() => {
        if (!isOpen) return;
        setTab('paste');
        setRawText('');
        setFileText('');
        setFileName('');
        setOcrText('');
        setOcrFileName('');
        setOcrFile(null);
        setPreviewItems([]);
        setPreviewed(false);
        setResult(null);
        setOmitDuplicates(true);
    }, [isOpen]);

    if (!isOpen) return null;

    const handlePreview = () => {
        if (tab === 'paste') {
            const payload = rawText.trim();
            if (!payload) {
                toast.error('Pega una lista para previsualizar');
                return;
            }
            const entries = parseRawText(payload);
            const preview = buildPreviewItems(entries, existingPhones);
            setPreviewItems(preview);
            setPreviewed(true);
            setResult(null);
            return;
        }

        if (tab === 'file') {
            if (!fileText) {
                toast.error('Adjunta un archivo para previsualizar');
                return;
            }
            const entries = parseFileText(fileText);
            const preview = buildPreviewItems(entries, existingPhones);
            setPreviewItems(preview);
            setPreviewed(true);
            setResult(null);
            return;
        }

        const ocrPayload = ocrText.trim();
        if (!ocrPayload) {
            toast.error('Adjunta un archivo para previsualizar');
            return;
        }
        const entries = parseRawText(ocrPayload);
        const preview = buildPreviewItems(entries, existingPhones);
        setPreviewItems(preview);
        setPreviewed(true);
        setResult(null);
    };

    const handleImport = async () => {
        if (!previewed) {
            toast.error('Previsualiza antes de importar');
            return;
        }
        if (!previewItems.length) {
            toast.error('No hay datos para importar');
            return;
        }
        setLoading(true);
        try {
            const payload = {
                mode: tab === 'file' ? 'file' : 'paste',
                omitDuplicates,
                defaults: {
                    status: 'NUEVO',
                    source: tab === 'file' ? 'CSV Import' : 'Lista pegada',
                    campaign: '',
                    ownerId: null
                }
            };
            if (tab === 'file') {
                payload.fileRows = previewItems.map((item) => ({ name: item.name, phone: item.phoneRaw }));
            } else if (tab === 'ocr') {
                payload.rawText = ocrText.trim();
                payload.defaults.source = 'OCR';
            } else {
                payload.rawText = rawText.trim();
            }
            const response = await api.post('/prospects/import', payload);
            setResult(response.data);
            toast.success('Importacion completada');
            onImported?.();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo importar');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            setFileText(String(reader.result || ''));
            setPreviewItems([]);
            setPreviewed(false);
            setResult(null);
        };
        reader.readAsText(file);
    };

    const handleOcrFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setOcrFileName(file.name);
        setOcrFile(file);
        setOcrText('');
        setPreviewItems([]);
        setPreviewed(false);
        setResult(null);
    };

    const handleOcrExtract = async () => {
        if (!ocrFile) {
            toast.error('Selecciona un archivo para OCR');
            return;
        }
        setOcrLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', ocrFile);
            const response = await api.post('/prospects/ocr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setOcrText(response.data?.text || '');
            setPreviewItems([]);
            setPreviewed(false);
            setResult(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo extraer texto');
        } finally {
            setOcrLoading(false);
        }
    };

    const previewRows = previewItems.slice(0, 20);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">Importar prospectos</h2>
                        <p className="text-xs text-slate-500">CSV/TXT o pegar lista</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 pt-4">
                    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setTab('paste')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl ${tab === 'paste' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                        >
                            Pegar lista
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('file')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl ${tab === 'file' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                        >
                            Subir CSV/TXT
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('ocr')}
                            className={`px-4 py-2 text-xs font-bold rounded-xl ${tab === 'ocr' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
                        >
                            PDF/Imagen (OCR)
                        </button>
                    </div>
                </div>

                <div className="px-6 py-4">
                    {tab === 'paste' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pegar lista</label>
                            <textarea
                                value={rawText}
                                onChange={(event) => setRawText(event.target.value)}
                                rows={8}
                                className="input-field bg-slate-50 border-slate-200 shadow-sm resize-none w-full"
                                placeholder={`Juan Perez,7865551234\nMaria Lopez - (305) 444-7788\nNombre: Jose y Olga Gomez\nTeléfono: 630-514-0420`}
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="button" onClick={handlePreview} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2">
                                    <FileText size={16} />
                                    Previsualizar
                                </button>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={omitDuplicates}
                                        onChange={(event) => setOmitDuplicates(event.target.checked)}
                                    />
                                    Omitir duplicados
                                </label>
                            </div>
                        </div>
                    )}

                    {tab === 'file' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir CSV/TXT</label>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="file"
                                    accept=".csv,.txt"
                                    onChange={handleFileChange}
                                    className="text-sm text-slate-600"
                                />
                                {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="button" onClick={handlePreview} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2">
                                    <UploadCloud size={16} />
                                    Previsualizar
                                </button>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={omitDuplicates}
                                        onChange={(event) => setOmitDuplicates(event.target.checked)}
                                    />
                                    Omitir duplicados
                                </label>
                            </div>
                        </div>
                    )}

                    {tab === 'ocr' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir PDF/Imagen</label>
                            <div className="flex flex-wrap items-center gap-3">
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={handleOcrFileChange}
                                    className="text-sm text-slate-600"
                                />
                                {ocrFileName && <span className="text-xs text-slate-500">{ocrFileName}</span>}
                            </div>
                            <button
                                type="button"
                                onClick={handleOcrExtract}
                                className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2"
                                disabled={ocrLoading}
                            >
                                <UploadCloud size={16} />
                                {ocrLoading ? 'Extrayendo...' : 'Extraer texto'}
                            </button>
                            <textarea
                                value={ocrText}
                                onChange={(event) => setOcrText(event.target.value)}
                                rows={6}
                                className="input-field bg-slate-50 border-slate-200 shadow-sm resize-none w-full"
                                placeholder="El texto extraido aparecera aqui"
                            />
                            <div className="flex flex-wrap items-center gap-3">
                                <button type="button" onClick={handlePreview} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2">
                                    <FileText size={16} />
                                    Previsualizar
                                </button>
                                <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                                    <input
                                        type="checkbox"
                                        checked={omitDuplicates}
                                        onChange={(event) => setOmitDuplicates(event.target.checked)}
                                    />
                                    Omitir duplicados
                                </label>
                            </div>
                        </div>
                    )}

                    {previewItems.length > 0 && (
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Previsualizacion</h3>
                                {previewItems.length > 20 && (
                                    <span className="text-xs text-slate-400">Mostrando 20 de {previewItems.length}</span>
                                )}
                            </div>
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-400">
                                        <tr>
                                            <th className="text-left px-4 py-2">Nombre</th>
                                            <th className="text-left px-4 py-2">Telefono</th>
                                            <th className="text-left px-4 py-2">Valido</th>
                                            <th className="text-left px-4 py-2">Duplicado</th>
                                            <th className="text-left px-4 py-2">Nota</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewRows.map((item, index) => (
                                            <tr key={`${item.name}-${index}`} className="border-t border-slate-100">
                                                <td className="px-4 py-2 text-slate-700">{item.name}</td>
                                                <td className="px-4 py-2 text-slate-500">{item.phoneDigits || item.phoneRaw || '-'}</td>
                                                <td className="px-4 py-2 text-slate-500">{item.isValid ? 'Si' : 'No'}</td>
                                                <td className="px-4 py-2 text-slate-500">{item.isDuplicate ? 'Si' : 'No'}</td>
                                                <td className="px-4 py-2 text-slate-400">{item.note || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Insertados: <span className="font-bold text-slate-800">{result.inserted}</span> ·
                            Duplicados omitidos: <span className="font-bold text-slate-800">{result.skipped_duplicates}</span> ·
                            Invalidos: <span className="font-bold text-slate-800">{result.invalid}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button type="button" onClick={onClose} className="btn-secondary !py-2 !px-4">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleImport}
                        disabled={loading}
                        className="btn-primary !py-2 !px-4"
                    >
                        {loading ? 'Importando...' : 'Importar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProspectImportModal;
