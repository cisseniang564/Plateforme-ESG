import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en.json';
import translationFR from './locales/fr.json';

const resources = {
  en: {
    translation: translationEN,
  },
  fr: {
    translation: translationFR,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    lng: localStorage.getItem('language') || 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

// ── Keep <html lang> + content-language meta in sync with the active language ──
function syncHtmlLang(lng: string) {
  const lang = (lng || 'fr').split('-')[0];   // normalize "fr-FR" → "fr"
  document.documentElement.lang = lang;
  let meta = document.querySelector('meta[http-equiv="content-language"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('http-equiv', 'content-language');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', lang);
}

syncHtmlLang(i18n.language);
i18n.on('languageChanged', syncHtmlLang);

export default i18n;
