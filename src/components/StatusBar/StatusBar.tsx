import styles from './StatusBar.module.css';

interface StatusBarProps {
  wordCount: number;
  issueCount: number;
}

export function StatusBar({ wordCount, issueCount }: StatusBarProps) {
  return (
    <div className={styles.bar}>
      <span>{wordCount} words</span>
      <span>{issueCount} suggestion{issueCount === 1 ? '' : 's'}</span>
    </div>
  );
}
