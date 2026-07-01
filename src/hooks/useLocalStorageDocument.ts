import { useMemo } from 'react';
import { DEFAULT_DOC_HTML, SAVE_DEBOUNCE_MS, STORAGE_KEY } from '../lib/constants';
import { useDebouncedCallback } from './useDebouncedCallback';

export function useLocalStorageDocument(): { initialHTML: string; save: (html: string) => void } {
  const initialHTML = useMemo(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_DOC_HTML;
    } catch {
      return DEFAULT_DOC_HTML;
    }
  }, []);

  const save = useDebouncedCallback((html: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, html);
    } catch {
      // Storage quota exceeded or private-mode restrictions — fail silently.
    }
  }, SAVE_DEBOUNCE_MS);

  return { initialHTML, save };
}
