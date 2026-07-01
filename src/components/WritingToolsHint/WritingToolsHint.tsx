import { useState } from 'react';
import { isSafari } from '../../lib/browserDetect';
import { HINT_DISMISSED_KEY } from '../../lib/constants';
import styles from './WritingToolsHint.module.css';

function readDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function WritingToolsHint() {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed) return null;

  const message = isSafari()
    ? 'Select any text in your document and look for the Writing Tools icon ✨ to proofread, rewrite, or summarize with Apple Intelligence.'
    : 'This app works best in Safari on macOS Sequoia+ / iOS 18.1+ with Apple Intelligence enabled — select text there to access Writing Tools (proofread, rewrite, summarize).';

  return (
    <div className={styles.banner}>
      <span className={styles.text}>{message}</span>
      <button
        type="button"
        className={styles.dismiss}
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(HINT_DISMISSED_KEY, '1');
          } catch {
            // ignore
          }
        }}
      >
        ×
      </button>
    </div>
  );
}
