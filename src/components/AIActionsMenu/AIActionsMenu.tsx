import { useEffect, useRef, useState } from 'react';
import {
  AI_ACTION_GROUPS,
  AI_ACTION_LABELS,
  describeAIError,
  isAIConfigured,
  runAIAction,
  type AIAction,
  type AIRunStatus,
} from '../../lib/aiEngine';
import { insertAIResult } from '../../lib/aiResultInsert';
import { Spinner } from '../Spinner/Spinner';
import styles from './AIActionsMenu.module.css';

interface AIActionsMenuProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
}

function unwrapElement(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  parent.normalize();
}

export function AIActionsMenu({ editableRef }: AIActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AIRunStatus>({ kind: 'idle' });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<Range | null>(null);
  // The locked-in target for this menu session: captured the instant the
  // menu opens, and from then on completely independent of the browser's
  // live Selection (which some browsers clear once focus moves to a
  // toolbar button, regardless of preventDefault). A visible highlight span
  // marks exactly what will be acted on, so there's no ambiguity even
  // though the native blue selection highlight disappears.
  const targetRangeRef = useRef<Range | null>(null);
  const targetMarkRef = useRef<HTMLElement | null>(null);
  const configured = isAIConfigured();

  useEffect(() => {
    if (!open) return;
    const onOutsideMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        clearTarget();
      }
    };
    window.addEventListener('mousedown', onOutsideMouseDown);
    return () => window.removeEventListener('mousedown', onOutsideMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Continuously track the last non-empty selection made inside the
    // editor, so there's something to fall back on if the live selection
    // is already gone by the time the toggle button's mousedown fires.
    const onSelectionChange = () => {
      const editor = editableRef.current;
      const sel = window.getSelection();
      if (!editor || !sel || sel.rangeCount === 0 || sel.isCollapsed) return;
      if (!editor.contains(sel.anchorNode)) return;
      lastSelectionRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editableRef]);

  function clearTarget(): void {
    if (targetMarkRef.current) {
      unwrapElement(targetMarkRef.current);
      targetMarkRef.current = null;
    }
    targetRangeRef.current = null;
  }

  function captureTarget(editor: HTMLDivElement): void {
    const selection = window.getSelection();
    let range: Range;
    if (selection && !selection.isCollapsed && editor.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
    } else if (lastSelectionRef.current && editor.contains(lastSelectionRef.current.startContainer)) {
      range = lastSelectionRef.current.cloneRange();
    } else {
      range = document.createRange();
      range.selectNodeContents(editor);
    }

    if (!range.collapsed) {
      try {
        const mark = document.createElement('span');
        mark.className = styles.aiTarget;
        range.surroundContents(mark);
        targetMarkRef.current = mark;
        const lockedRange = document.createRange();
        lockedRange.selectNodeContents(mark);
        targetRangeRef.current = lockedRange;
        return;
      } catch {
        // Range crosses element boundaries surroundContents can't handle —
        // fall back to acting on it without a visual lock.
      }
    }
    targetRangeRef.current = range;
  }

  const runAction = async (action: AIAction) => {
    const editor = editableRef.current;
    const range = targetRangeRef.current;
    if (!editor || !range) return;

    const sourceText = range.toString();
    if (!sourceText.trim()) {
      clearTarget();
      return;
    }

    setStatus({ kind: 'busy', text: 'Thinking…' });

    try {
      const resultText = await runAIAction(action, sourceText);
      if (!resultText) {
        setStatus({ kind: 'error', message: 'The model returned an empty result. Try again.' });
        return;
      }
      const collapsedRange = insertAIResult(range, editor, action, resultText);
      if (targetMarkRef.current) {
        unwrapElement(targetMarkRef.current);
        targetMarkRef.current = null;
      }
      targetRangeRef.current = null;
      editor.normalize();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(collapsedRange);
      }
      editor.focus();
      setStatus({ kind: 'idle' });
    } catch (err) {
      clearTarget();
      setStatus({ kind: 'error', message: describeAIError(err) });
    }
  };

  const busy = status.kind === 'busy';

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.toggle} ${busy ? styles.toggleBusy : ''}`}
        disabled={!configured || busy}
        title={configured ? 'AI writing actions' : 'AI features are not configured (missing VITE_AI_PROXY_URL)'}
        onMouseDown={(e) => {
          e.preventDefault();
          setStatus({ kind: 'idle' });
          if (open) {
            clearTarget();
            setOpen(false);
            return;
          }
          const editor = editableRef.current;
          if (editor) captureTarget(editor);
          setOpen(true);
        }}
      >
        {busy && <Spinner />}
        ✨ AI Actions
      </button>

      {open && !busy && (
        <div className={styles.menu}>
          {AI_ACTION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className={styles.groupLabel}>{group.label}</p>
              {group.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className={styles.menuItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setOpen(false);
                    void runAction(action);
                  }}
                >
                  {AI_ACTION_LABELS[action]}
                </button>
              ))}
            </div>
          ))}
          <p className={styles.hint}>Select text first, or leave nothing selected to act on the whole document.</p>
        </div>
      )}

      {busy && (
        <div className={styles.status}>
          <Spinner />
          {status.text}
        </div>
      )}

      {status.kind === 'error' && (
        <div className={styles.status}>
          <div className={styles.error}>{status.message}</div>
        </div>
      )}
    </div>
  );
}
