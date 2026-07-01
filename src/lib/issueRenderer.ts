import { checkText } from './grammarRules';
import { getPlainTextAndMap, nodeOffsetToPlainTextOffset, offsetsToRange } from './domTextMapping';
import type { AISuggestion } from './aiSuggestions';
import type { Issue } from '../types';

/**
 * AI suggestions carry a verbatim quote (`original`) rather than a fixed
 * offset, since the document may have changed since the AI request was
 * made. Offsets are re-resolved against the current text on every render,
 * so a suggestion whose quote no longer appears (edited away) is dropped
 * rather than rendered at a stale/wrong position.
 */
function aiSuggestionsToIssues(text: string, suggestions: AISuggestion[]): Issue[] {
  const issues: Issue[] = [];
  for (const s of suggestions) {
    const start = text.indexOf(s.original);
    if (start === -1) continue;
    const end = start + s.original.length;
    issues.push({
      id: `ai-${start}-${end}`,
      ruleId: 'ai',
      category: s.category,
      message: s.explanation,
      start,
      end,
      matchedText: s.original,
      suggestion: s.suggestion,
    });
  }
  return issues;
}

const ISSUE_ATTR = 'data-issue-id';

function unwrapMark(mark: Element): void {
  const parent = mark.parentNode;
  if (!parent) return;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
}

function unwrapAllMarks(root: HTMLElement): void {
  root.querySelectorAll(`[${ISSUE_ATTR}]`).forEach(unwrapMark);
  root.normalize();
}

function captureCaretOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const map = getPlainTextAndMap(root);
  return nodeOffsetToPlainTextOffset(map, range.startContainer, range.startOffset);
}

function restoreCaretOffset(root: HTMLElement, offset: number): void {
  const map = getPlainTextAndMap(root);
  const range = offsetsToRange(map, offset, offset);
  if (!range) return;
  const selection = window.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Full remove-and-rebuild cycle: unwraps all existing issue marks, recomputes
 * plain text from a clean DOM, runs the grammar rules, and re-wraps each
 * match in a <span data-issue-id> so offsets are always valid. Runs only on
 * a debounced idle timer (never per-keystroke), so the cost of always
 * rebuilding from scratch — rather than incrementally diffing — is cheap and
 * avoids stale-offset/orphaned-mark bugs entirely.
 */
export function recomputeAndRenderIssues(
  root: HTMLElement,
  dismissed: Set<string>,
  aiSuggestions: AISuggestion[] = [],
): Issue[] {
  const hadFocus = root.contains(document.activeElement) || document.activeElement === root;
  const caretOffset = hadFocus ? captureCaretOffset(root) : null;

  unwrapAllMarks(root);

  const initialMap = getPlainTextAndMap(root);
  const ruleIssues = checkText(initialMap.text);
  const aiIssues = aiSuggestionsToIssues(initialMap.text, aiSuggestions);
  const allIssues = [...ruleIssues, ...aiIssues].sort((a, b) => a.start - b.start);
  const visibleIssues = allIssues.filter(
    (issue) => !dismissed.has(`${issue.ruleId}:${issue.matchedText}`),
  );

  // Process back-to-front, re-walking the DOM before each wrap: surroundContents
  // can split a text node to isolate the matched substring, which would leave
  // any other issue's cached node reference pointing at a now-truncated node.
  // Plain-text offsets stay valid throughout since only DOM structure (not
  // text content) changes between wraps.
  for (let i = visibleIssues.length - 1; i >= 0; i -= 1) {
    const issue = visibleIssues[i];
    const map = getPlainTextAndMap(root);
    const range = offsetsToRange(map, issue.start, issue.end);
    if (!range) continue;
    try {
      const mark = document.createElement('span');
      mark.className = `issue issue-${issue.category}${issue.ruleId === 'ai' ? ' issue-ai' : ''}`;
      mark.setAttribute(ISSUE_ATTR, issue.id);
      mark.title = issue.message;
      range.surroundContents(mark);
    } catch {
      // Range crosses a non-text-node boundary in a way surroundContents can't
      // handle; skip this match rather than corrupt the DOM.
    }
  }

  if (hadFocus && caretOffset !== null) {
    restoreCaretOffset(root, caretOffset);
  }

  return visibleIssues;
}

/** Replaces a live issue span's text with its suggested fix and unwraps the mark. */
export function applyFix(root: HTMLElement, issueId: string, suggestion: string): void {
  const mark = root.querySelector(`[${ISSUE_ATTR}="${issueId}"]`);
  if (!mark) return;
  mark.textContent = suggestion;
  unwrapMark(mark);
  root.normalize();
}
