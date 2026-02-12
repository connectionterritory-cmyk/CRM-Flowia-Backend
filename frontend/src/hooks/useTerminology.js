import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const STORAGE_KEY = 'flowsuite_tenant_terminology';

const safeParse = (value) => {
    try {
        return value ? JSON.parse(value) : {};
    } catch (error) {
        return {};
    }
};

const DEFAULT_TERMINOLOGY = (t) => ({
    admin: t('terminology.admin'),
    advisor: t('terminology.advisor'),
    seller: t('terminology.seller'),
    contact: t('terminology.contact'),
    lead: t('terminology.lead'),
    customer: t('terminology.customer'),
    opportunity: t('terminology.opportunity'),
    program: t('terminology.program'),
    order: t('terminology.order'),
    service: t('terminology.service')
});

const pluralize = (term, overrides, key, language) => {
    if (overrides && overrides[key]) return overrides[key];
    if (!term) return '';
    const lang = (language || '').toLowerCase();
    if (lang.startsWith('es')) {
        if (term.endsWith('s')) return term;
        if (term.endsWith('ión')) return `${term.slice(0, -3)}iones`;
        if (term.endsWith('dad')) return `${term.slice(0, -3)}dades`;
        if (term.endsWith('z')) return `${term.slice(0, -1)}ces`;
        if (/[aeiouáéíóú]$/i.test(term)) return `${term}s`;
        return `${term}es`;
    }
    if (lang.startsWith('pt')) {
        if (term.endsWith('s')) return term;
        if (term.endsWith('m')) return `${term.slice(0, -1)}ns`;
        if (/[aeiouáéíóú]$/i.test(term)) return `${term}s`;
        return `${term}es`;
    }
    if (term.endsWith('s')) return term;
    return `${term}s`;
};

export const useTerminology = () => {
    const { t, i18n } = useTranslation();
    const defaults = useMemo(() => DEFAULT_TERMINOLOGY(t), [t]);

    const stored = useMemo(() => {
        if (typeof window === 'undefined') return {};
        return safeParse(localStorage.getItem(STORAGE_KEY));
    }, []);

    const [terminology, setTerminologyState] = useState({
        ...defaults,
        ...(stored.terminology || stored)
    });

    const pluralOverrides = useMemo(() => (
        stored.pluralOverrides || {}
    ), [stored]);

    const term = (key) => terminology[key] || defaults[key] || '';

    const termPlural = (key) => pluralize(term(key), pluralOverrides, key, i18n.language);

    const setTerminology = (patch) => {
        const updated = { ...terminology, ...patch };
        setTerminologyState(updated);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            terminology: updated,
            pluralOverrides
        }));
    };

    const resetTerminology = () => {
        localStorage.removeItem(STORAGE_KEY);
        setTerminologyState({ ...defaults });
    };

    return {
        terminology,
        term,
        termPlural,
        setTerminology,
        resetTerminology
    };
};
