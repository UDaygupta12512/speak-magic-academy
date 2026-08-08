import { useCallback, useEffect, useState } from "react";

export type AppLanguage = "en" | "hi";

const KEY = "speakgenie:lang";
const EVENT = "speakgenie:lang-change";

export const getStoredLanguage = (): AppLanguage => {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(KEY);
  return saved === "hi" ? "hi" : "en";
};

/**
 * App-wide language preference (English / Hindi), persisted in localStorage
 * and synchronized across tabs and components via a custom event + the native
 * `storage` event. Used by Practice Chat, AI Call, and Comic Book.
 */
export const useAppLanguage = (): [AppLanguage, (lang: AppLanguage) => void, () => void] => {
  const [lang, setLangState] = useState<AppLanguage>(getStoredLanguage);

  useEffect(() => {
    const sync = () => setLangState(getStoredLanguage());
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setLanguage = useCallback((next: AppLanguage) => {
    try {
      window.localStorage.setItem(KEY, next);
      window.dispatchEvent(new CustomEvent(EVENT));
    } catch {
      /* noop */
    }
    setLangState(next);
  }, []);

  const toggle = useCallback(() => {
    setLanguage(getStoredLanguage() === "en" ? "hi" : "en");
  }, [setLanguage]);

  return [lang, setLanguage, toggle];
};
