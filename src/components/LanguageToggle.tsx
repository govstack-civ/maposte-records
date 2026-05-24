'use client';

import { useLanguage } from '@/context/LanguageContext';

export function LanguageToggle() {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2 py-0.5 rounded transition-colors ${
          lang === 'fr'
            ? 'bg-[#3333FF] text-white'
            : 'text-[#1A1A2E] hover:text-[#3333FF]'
        }`}
        aria-label="Français"
      >
        FR
      </button>
      <span className="text-[#1A1A2E]/30">|</span>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-0.5 rounded transition-colors ${
          lang === 'en'
            ? 'bg-[#3333FF] text-white'
            : 'text-[#1A1A2E] hover:text-[#3333FF]'
        }`}
        aria-label="English"
      >
        EN
      </button>
    </div>
  );
}
