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
import styles from './AIActionsMenu.module.css';

interface AIActionsMenuProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
}

export function AIActionsMenu({ editableRef }: AIActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AIRunStatus>({ kind: 'idle' });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectionRef = useRef<Range | null>(null);
  const configured = isAIConfigured();

  useEffect(() => {
    if (!open) return;
    const onOutsideMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutsideMouseDown);
    return () => window.removeEventListener('mousedown', onOutsideMouseDown);
  }, [open]);

  useEffect(() => {
    // Safari can clear the live Selection when focus moves to a toolbar
    // button, even with preventDefault on mousedown (unlike Chrome, where
    // that alone keeps the selection intact). Tracking the last non-empty
    // selection made inside the editor gives runAction something reliable
    // to fall back on regardless of browser quirks.
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

  const runAction = async (action: AIAction) => {
    const editor = editableRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    let range: Range;
    if (selection && !selection.isCollapsed && editor.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
    } else if (lastSelectionRef.current && editor.contains(lastSelectionRef.current.startContainer)) {
      range = lastSelectionRef.current.cloneRange();
    } else {
      // No selection: act on the whole document.
      range = document.createRange();
      range.selectNodeContents(editor);
    }
    lastSelectionRef.current = null;
    const sourceText = range.toString();
    if (!sourceText.trim()) return;

    setStatus({ kind: 'busy', text: 'Thinking…' });

    try {
      const resultText = await runAIAction(action, sourceText);
      if (!resultText) {
        setStatus({ kind: 'error', message: 'The model returned an empty result. Try again.' });
        return;
      }
      const collapsedRange = insertAIResult(range, editor, action, resultText);
      editor.normalize();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(collapsedRange);
      }
      editor.focus();
      setStatus({ kind: 'idle' });
    } catch (err) {
      setStatus({ kind: 'error', message: describeAIError(err) });
    }
  };

  const busy = status.kind === 'busy';

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.toggle}
        disabled={!configured || busy}
        title={configured ? 'AI writing actions' : 'AI features are not configured (missing VITE_AI_PROXY_URL)'}
        onMouseDown={(e) => {
          e.preventDefault();
          setStatus({ kind: 'idle' });
          setOpen((v) => !v);
        }}
      >
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
          <div>{status.text}</div>
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
