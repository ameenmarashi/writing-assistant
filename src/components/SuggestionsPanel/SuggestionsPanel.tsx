import type { Issue } from '../../types';
import styles from './SuggestionsPanel.module.css';

interface SuggestionsPanelProps {
  issues: Issue[];
  onJump: (issue: Issue) => void;
  onApply: (issue: Issue) => void;
  onDismiss: (issue: Issue) => void;
}

const CHIP_CLASS: Record<Issue['category'], string> = {
  grammar: styles.chipGrammar,
  style: styles.chipStyle,
  clarity: styles.chipClarity,
};

export function SuggestionsPanel({ issues, onJump, onApply, onDismiss }: SuggestionsPanelProps) {
  return (
    <div className={styles.panel}>
      <p className={styles.heading}>Suggestions ({issues.length})</p>
      {issues.length === 0 && <p className={styles.empty}>No issues found — nice writing!</p>}
      {issues.map((issue) => (
        <div key={issue.id} className={styles.item} onClick={() => onJump(issue)}>
          <span className={`${styles.chip} ${CHIP_CLASS[issue.category]}`} />
          <span className={styles.matched}>&ldquo;{issue.matchedText}&rdquo;</span>
          <p className={styles.message}>{issue.message}</p>
          <div className={styles.actions}>
            {issue.suggestion !== undefined && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(issue);
                }}
              >
                Apply fix
              </button>
            )}
            <button
              type="button"
              className={styles.actionButton}
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(issue);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
