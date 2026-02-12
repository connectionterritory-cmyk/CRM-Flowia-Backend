import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

const storedLanguage = localStorage.getItem('i18nextLng');
if (!storedLanguage) {
    localStorage.setItem('i18nextLng', 'es');
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            es: { translation: es },
            en: { translation: en },
            pt: { translation: pt }
        },
        lng: storedLanguage || 'es',
        fallbackLng: 'es',
        supportedLngs: ['es', 'en', 'pt'],
        detection: {
            order: ['localStorage'],
            caches: ['localStorage']
        },
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
