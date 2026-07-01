import { useEffect, useRef, useState } from 'react';
import type { InitProgressReport } from '@mlc-ai/web-llm';
import { AI_ACTION_LABELS, isWebGPUSupported, runAIAction, type AIAction } from '../../lib/aiEngine';
import { insertAIResult } from '../../lib/aiResultInsert';
import styles from './AIActionsMenu.module.css';

const ACTIONS: AIAction[] = [
  'proofread',
  'rewrite',
  'professional',
  'friendly',
  'concise',
  'informative',
  'list',
];

type Status = { kind: 'idle' } | { kind: 'busy'; text: string; progress: number | null } | { kind: 'error'; message: string };

interface AIActionsMenuProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
}

export function AIActionsMenu({ editableRef }: AIActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const containerRef = useRef<HTMLDivElement>(null);
  const webGPUSupported = isWebGPUSupported();

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

  const runAction = async (action: AIAction) => {
    const editor = editableRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    let range: Range;
    if (selection && !selection.isCollapsed && editor.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
    } else {
      // No selection: act on the whole document.
      range = document.createRange();
      range.selectNodeContents(editor);
    }
    const sourceText = range.toString();
    if (!sourceText.trim()) return;

    setStatus({ kind: 'busy', text: 'Starting…', progress: null });

    try {
      const resultText = await runAIAction(action, sourceText, (report: InitProgressReport) => {
        setStatus({ kind: 'busy', text: report.text, progress: report.progress });
      });
      if (!resultText) {
        setStatus({ kind: 'error', message: 'The model returned an empty result. Try again.' });
        return;
      }
      const collapsedRange = insertAIResult(range, action, resultText);
      editor.normalize();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(collapsedRange);
      }
      editor.focus();
      setStatus({ kind: 'idle' });
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const message = /fetch/i.test(raw)
        ? "Couldn't download the AI model — check your internet connection and try again."
        : raw || 'AI action failed. Try again.';
      setStatus({ kind: 'error', message });
    }
  };

  const busy = status.kind === 'busy';

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.toggle}
        disabled={!webGPUSupported || busy}
        title={
          webGPUSupported
            ? 'AI writing actions (runs on-device, first use downloads a model)'
            : 'AI actions need a WebGPU-capable browser (e.g. recent Chrome/Edge/Safari)'
        }
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
          {ACTIONS.map((action) => (
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
          <p className={styles.hint}>Select text first, or leave nothing selected to act on the whole document.</p>
        </div>
      )}

      {busy && (
        <div className={styles.status}>
          <div>{status.text}</div>
          {status.progress !== null && (
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${Math.round(status.progress * 100)}%` }} />
            </div>
          )}
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
