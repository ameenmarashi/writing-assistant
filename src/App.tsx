import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './App.module.css';
import { Toolbar } from './components/Toolbar/Toolbar';
import { Editor } from './components/Editor/Editor';
import { useContentEditable } from './components/Editor/useContentEditable';
import { SuggestionsPanel } from './components/SuggestionsPanel/SuggestionsPanel';
import { WritingToolsHint } from './components/WritingToolsHint/WritingToolsHint';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useLocalStorageDocument } from './hooks/useLocalStorageDocument';
import { useDebouncedCallback } from './hooks/useDebouncedCallback';
import { applyFix, recomputeAndRenderIssues } from './lib/issueRenderer';
import { exportAsDocx, exportAsTxt } from './lib/exportDocument';
import { GRAMMAR_CHECK_DEBOUNCE_MS } from './lib/constants';
import type { Issue } from './types';

function fingerprint(issue: Issue): string {
  return `${issue.ruleId}:${issue.matchedText}`;
}

function App() {
  const { initialHTML, save } = useLocalStorageDocument();
  const [issues, setIssues] = useState<Issue[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const runGrammarCheck = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const visible = recomputeAndRenderIssues(el, dismissedRef.current);
    setIssues(visible);
  }, []);

  const debouncedGrammarCheck = useDebouncedCallback(runGrammarCheck, GRAMMAR_CHECK_DEBOUNCE_MS);

  const onChange = useCallback(
    (html: string) => {
      save(html);
      debouncedGrammarCheck();
    },
    [save, debouncedGrammarCheck],
  );

  const { getHTML, getPlainText } = useContentEditable(ref, { initialHTML, onChange });

  useEffect(() => {
    runGrammarCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedText = getPlainText().trim();
  const wordCount = trimmedText.length ? trimmedText.split(/\s+/).length : 0;

  const handleJump = (issue: Issue) => {
    const el = ref.current?.querySelector(`[data-issue-id="${issue.id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('issue-flash');
    setTimeout(() => el.classList.remove('issue-flash'), 1200);
  };

  const handleApply = (issue: Issue) => {
    const el = ref.current;
    if (!el) return;
    applyFix(el, issue.id, issue.suggestion ?? '');
    save(el.innerHTML);
    runGrammarCheck();
  };

  const handleDismiss = (issue: Issue) => {
    dismissedRef.current.add(fingerprint(issue));
    runGrammarCheck();
  };

  return (
    <div className={styles.app}>
      <WritingToolsHint />
      <Toolbar
        editableRef={ref}
        onExportTxt={() => exportAsTxt(getPlainText())}
        onExportDocx={() => exportAsDocx(getHTML())}
      />
      <div className={styles.body}>
        <div className={styles.scrollArea}>
          <Editor editableRef={ref} />
        </div>
        <SuggestionsPanel
          issues={issues}
          onJump={handleJump}
          onApply={handleApply}
          onDismiss={handleDismiss}
        />
      </div>
      <StatusBar wordCount={wordCount} issueCount={issues.length} />
    </div>
  );
}

export default App;
