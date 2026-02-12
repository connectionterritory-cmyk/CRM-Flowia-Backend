import React, { useMemo, useState } from 'react';

const normalizeTag = (value) => value.trim();

const TagInput = ({ tags = [], onChange, maxTags = 10 }) => {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState('');

    const normalizedTags = useMemo(
        () => tags.map((tag) => normalizeTag(tag)).filter(Boolean),
        [tags]
    );

    const hasReachedLimit = normalizedTags.length >= maxTags;

    const isDuplicate = (candidate) => {
        const normalizedCandidate = candidate.toLowerCase();
        return normalizedTags.some((tag) => tag.toLowerCase() === normalizedCandidate);
    };

    const pushTag = (value) => {
        const cleaned = normalizeTag(value);

        if (!cleaned) {
            setError('');
            return;
        }

        if (hasReachedLimit) {
            setError(`Maximo ${maxTags} tags.`);
            return;
        }

        if (isDuplicate(cleaned)) {
            setError('Tag duplicado.');
            return;
        }

        const nextTags = [...normalizedTags, cleaned];
        onChange?.(nextTags);
        setInputValue('');
        setError('');
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            pushTag(inputValue);
        }
    };

    const removeTag = (index) => {
        const nextTags = normalizedTags.filter((_, tagIndex) => tagIndex !== index);
        onChange?.(nextTags);
        setError('');
    };

    const handleChange = (event) => {
        setInputValue(event.target.value);
        if (error) {
            setError('');
        }
    };

    return (
        <div className="w-full">
            <div className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all">
                <div className="flex flex-wrap items-center gap-2">
                    {normalizedTags.map((tag, index) => (
                        <span
                            key={`${tag}-${index}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 text-xs font-semibold"
                        >
                            <span className="max-w-[140px] truncate sm:max-w-[200px]">{tag}</span>
                            <button
                                type="button"
                                onClick={() => removeTag(index)}
                                className="rounded-full border border-indigo-100 bg-white text-indigo-500 hover:text-indigo-700 hover:border-indigo-200 transition-colors px-1"
                                aria-label={`Eliminar ${tag}`}
                            >
                                x
                            </button>
                        </span>
                    ))}
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={hasReachedLimit}
                        placeholder={hasReachedLimit ? 'Limite de tags alcanzado' : 'Agrega un tag y presiona Enter'}
                        className="min-w-[160px] flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
                    />
                </div>
            </div>
            <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
                <span>{normalizedTags.length} / {maxTags} tags</span>
                {error && <span className="text-rose-500 font-semibold">{error}</span>}
            </div>
        </div>
    );
};

export default TagInput;
