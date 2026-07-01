import { useEffect, useLayoutEffect, useRef } from 'react';
import { CONTENT_SYNC_DEBOUNCE_MS } from '../../lib/constants';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

interface UseContentEditableOptions {
  initialHTML: string;
  onChange: (html: string, plainText: string) => void;
}

interface UseContentEditableResult {
  focus: () => void;
  getPlainText: () => string;
  getHTML: () => string;
  setHTML: (html: string) => void;
}

/**
 * Treats the contenteditable DOM as the source of truth while editing:
 * React sets innerHTML exactly once on mount, then never writes into the
 * subtree again during typing. This avoids the classic contenteditable+React
 * cursor-jump bug, and — critically — tolerates Safari's Writing Tools
 * rewriting DOM content in place, since a controlled `value` prop would
 * otherwise fight those external mutations.
 *
 * The element ref is supplied by the caller (rather than created here) so
 * other callbacks defined alongside it in the parent component can close
 * over the same stable ref without an ordering/circular-dependency dance.
 */
export function useContentEditable(
  ref: React.RefObject<HTMLDivElement | null>,
  { initialHTML, onChange }: UseContentEditableOptions,
): UseContentEditableResult {
  const didInit = useRef(false);

  useLayoutEffect(() => {
    if (didInit.current || !ref.current) return;
    ref.current.innerHTML = initialHTML;
    didInit.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const debouncedOnChange = useDebouncedCallback(() => {
    const el = ref.current;
    if (!el) return;
    onChange(el.innerHTML, el.textContent ?? '');
  }, CONTENT_SYNC_DEBOUNCE_MS);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('input', debouncedOnChange);
    // Backstop: Writing Tools can replace selected ranges via native editing
    // commands that may not always dispatch a normal `input` event.
    const observer = new MutationObserver(debouncedOnChange);
    observer.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      el.removeEventListener('input', debouncedOnChange);
      observer.disconnect();
    };
  }, [debouncedOnChange, ref]);

  return {
    focus: () => ref.current?.focus(),
    getPlainText: () => ref.current?.textContent ?? '',
    getHTML: () => ref.current?.innerHTML ?? '',
    setHTML: (html: string) => {
      if (ref.current) ref.current.innerHTML = html;
    },
  };
}
