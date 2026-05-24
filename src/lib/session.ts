// Client-side session helpers using localStorage

export const SESSION_KEY = 'maposte_citizen_id';
export const NNI_KEY = 'maposte_nni';
export const LANG_KEY = 'maposte_lang';
export const CREDENTIALS_KEY = 'maposte_credentials';
export const PAYMENT_KEY = 'maposte_payment_id';

export function getSession(): { citizenId: string | null; nni: string | null } {
  if (typeof window === 'undefined') return { citizenId: null, nni: null };
  return {
    citizenId: localStorage.getItem(SESSION_KEY),
    nni: localStorage.getItem(NNI_KEY),
  };
}

export function setSession(citizenId: string, nni: string) {
  localStorage.setItem(SESSION_KEY, citizenId);
  localStorage.setItem(NNI_KEY, nni);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(NNI_KEY);
  localStorage.removeItem(CREDENTIALS_KEY);
  localStorage.removeItem(PAYMENT_KEY);
}

export function getLang(): 'en' | 'fr' {
  if (typeof window === 'undefined') return 'fr';
  return (localStorage.getItem(LANG_KEY) as 'en' | 'fr') ?? 'fr';
}

export function setLang(lang: 'en' | 'fr') {
  localStorage.setItem(LANG_KEY, lang);
}

export function getCredentialIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CREDENTIALS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function setCredentialIds(ids: string[]) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(ids));
}
