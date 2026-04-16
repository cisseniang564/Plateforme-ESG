import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermer sur clic extérieur — sans overlay transparent qui bloque les clics
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100"
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium uppercase">{i18n.language}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <button
            onClick={() => changeLanguage('en')}
            className={`flex items-center justify-between w-full text-left px-4 py-3 text-sm hover:bg-gray-100 transition-colors ${
              i18n.language === 'en'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🇬🇧</span>
              English
            </span>
            {i18n.language === 'en' && <Check className="h-4 w-4" />}
          </button>

          <button
            onClick={() => changeLanguage('fr')}
            className={`flex items-center justify-between w-full text-left px-4 py-3 text-sm hover:bg-gray-100 transition-colors ${
              i18n.language === 'fr'
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">🇫🇷</span>
              Français
            </span>
            {i18n.language === 'fr' && <Check className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
