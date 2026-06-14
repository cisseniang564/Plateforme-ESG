import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// ── Lazy-loaded locale resources ────────────────────────────────────────────
// en.json (~720 KB) and fr.json (~185 KB) are code-split into their own
// chunks and fetched on demand instead of being bundled into the main entry
// chunk (they were the largest single contributor to its size).
const localeLoaders: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  fr: () => import('./locales/fr.json'),
  en: () => import('./locales/en.json'),
};

const lazyResourceBackend = {
  type: 'backend' as const,
  init: () => {},
  read(language: string, _namespace: string, callback: (err: unknown, data: unknown) => void) {
    const load = localeLoaders[language] ?? localeLoaders.fr;
    load()
      .then((mod) => callback(null, mod.default))
      .catch((err) => callback(err, null));
  },
};

i18n
  .use(lazyResourceBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    lng: localStorage.getItem('language') || 'fr',
    interpolation: {
      escapeValue: false,
    },
    react: {
      // Resources load asynchronously — re-render once ready instead of
      // requiring a <Suspense> boundary around every translated component.
      useSuspense: false,
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
