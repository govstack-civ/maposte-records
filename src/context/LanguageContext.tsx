'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type Lang, t as translate, type StringKey } from '@/lib/i18n';
import { getLang, setLang } from '@/lib/session';

interface LanguageContextValue {
  lang: Lang;
  setLanguage: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    setLangState(getLang());
  }, []);

  function setLanguage(newLang: Lang) {
    setLangState(newLang);
    setLang(newLang);
  }

  function t(key: StringKey, vars?: Record<string, string | number>) {
    return translate(lang, key, vars);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
