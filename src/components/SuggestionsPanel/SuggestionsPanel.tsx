import type { AIRunStatus } from '../../lib/aiEngine';
import type { Issue } from '../../types';
import { Spinner } from '../Spinner/Spinner';
import styles from './SuggestionsPanel.module.css';

interface SuggestionsPanelProps {
  issues: Issue[];
  onJump: (issue: Issue) => void;
  onApply: (issue: Issue) => void;
  onDismiss: (issue: Issue) => void;
  onRunAICheck: () => void;
  aiCheckStatus: AIRunStatus;
  aiCheckAvailable: boolean;
}

const CHIP_CLASS: Record<Issue['category'], string> = {
  grammar: styles.chipGrammar,
  style: styles.chipStyle,
  clarity: styles.chipClarity,
};

export function SuggestionsPanel({
  issues,
  onJump,
  onApply,
  onDismiss,
  onRunAICheck,
  aiCheckStatus,
  aiCheckAvailable,
}: SuggestionsPanelProps) {
  const busy = aiCheckStatus.kind === 'busy';

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={`${styles.aiCheckButton} ${busy ? styles.aiCheckButtonBusy : ''}`}
        disabled={!aiCheckAvailable || busy}
        title={
          aiCheckAvailable
            ? 'Analyze the whole document with AI'
            : 'AI features are not configured yet'
        }
        onClick={onRunAICheck}
      >
        {busy && <Spinner />}
        ✨ Check writing with AI
      </button>
      {busy && (
        <div className={styles.aiCheckStatus}>
          <Spinner />
          {aiCheckStatus.text}
        </div>
      )}
      {aiCheckStatus.kind === 'error' && (
        <div className={`${styles.aiCheckStatus} ${styles.error}`}>{aiCheckStatus.message}</div>
      )}

      <p className={styles.heading}>Suggestions ({issues.length})</p>
      {issues.length === 0 && <p className={styles.empty}>No issues found — nice writing!</p>}
      {issues.map((issue) => (
        <div key={issue.id} className={styles.item} onClick={() => onJump(issue)}>
          <span className={`${styles.chip} ${CHIP_CLASS[issue.category]}`} />
          {issue.ruleId === 'ai' && <span className={styles.aiBadge}>AI</span>}
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
