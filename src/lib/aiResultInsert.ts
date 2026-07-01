import type { AIAction } from './aiEngine';
import { buildTableElement } from './tableInsert';
import { findBlockAncestor } from './toolbarCommands';

function buildListFragment(text: string): DocumentFragment {
  const items = text
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*|^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const ul = document.createElement('ul');
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  }
  const frag = document.createDocumentFragment();
  frag.appendChild(ul);
  return frag;
}

function buildTableFragment(raw: string): DocumentFragment {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in table response');
  }
  const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1));
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Table response was not an object');
  }
  const { headers, rows } = parsed as { headers?: unknown; rows?: unknown };
  const headerCells = Array.isArray(headers) ? headers.map(String) : [];
  const bodyRows = Array.isArray(rows)
    ? rows.map((row) => (Array.isArray(row) ? row.map(String) : []))
    : [];
  if (headerCells.length === 0 && bodyRows.length === 0) {
    throw new Error('Table response had no headers or rows');
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(buildTableElement(headerCells, bodyRows));
  return frag;
}

function buildTextFragment(text: string): DocumentFragment {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const frag = document.createDocumentFragment();
  if (paragraphs.length <= 1) {
    frag.appendChild(document.createTextNode(text));
    return frag;
  }
  for (const paragraph of paragraphs) {
    const p = document.createElement('p');
    p.textContent = paragraph;
    frag.appendChild(p);
  }
  return frag;
}

/**
 * Replaces a Range's contents with an AI result, rendered as real HTML
 * (paragraphs/list items) rather than raw text with markdown-style bullets,
 * consistent with the rest of the editor never showing literal syntax.
 * Returns a collapsed Range at the end of the inserted content, for caret placement.
 */
function buildFragmentForAction(action: AIAction, resultText: string): { fragment: DocumentFragment; isBlock: boolean } {
  if (action === 'table') {
    try {
      return { fragment: buildTableFragment(resultText), isBlock: true };
    } catch {
      // Model didn't return valid/parseable table JSON — fall back rather than crash.
      return { fragment: buildTextFragment(resultText), isBlock: false };
    }
  }
  if (action === 'list' || action === 'keyPoints') {
    return { fragment: buildListFragment(resultText), isBlock: false };
  }
  return { fragment: buildTextFragment(resultText), isBlock: false };
}

export function insertAIResult(range: Range, root: HTMLElement, action: AIAction, resultText: string): Range {
  const { fragment, isBlock } = buildFragmentForAction(action, resultText);
  const lastNode = fragment.lastChild;

  // A table must land as a sibling of the current paragraph, not literally at
  // the cursor — otherwise it nests inside (and inherits from) whatever
  // inline formatting (color/font spans) happens to surround the cursor.
  const block = isBlock ? findBlockAncestor(range.startContainer, root) : null;
  if (block?.parentNode) {
    range.deleteContents();
    block.parentNode.insertBefore(fragment, block.nextSibling);
  } else {
    range.deleteContents();
    range.insertNode(fragment);
  }

  const collapsed = document.createRange();
  if (lastNode) {
    collapsed.setStartAfter(lastNode);
  } else {
    collapsed.setStart(range.startContainer, range.startOffset);
  }
  collapsed.collapse(true);
  return collapsed;
}
