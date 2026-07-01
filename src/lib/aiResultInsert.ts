import type { AIAction } from './aiEngine';

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
export function insertAIResult(range: Range, action: AIAction, resultText: string): Range {
  range.deleteContents();
  const fragment = action === 'list' ? buildListFragment(resultText) : buildTextFragment(resultText);
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  const collapsed = document.createRange();
  if (lastNode) {
    collapsed.setStartAfter(lastNode);
  } else {
    collapsed.setStart(range.startContainer, range.startOffset);
  }
  collapsed.collapse(true);
  return collapsed;
}
