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

  const table = document.createElement('table');
  if (headerCells.length > 0) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const cell of headerCells) {
      const th = document.createElement('th');
      th.textContent = cell;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }
  const tbody = document.createElement('tbody');
  for (const row of bodyRows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const frag = document.createDocumentFragment();
  frag.appendChild(table);
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
function buildFragmentForAction(action: AIAction, resultText: string): DocumentFragment {
  if (action === 'table') {
    try {
      return buildTableFragment(resultText);
    } catch {
      // Model didn't return valid/parseable table JSON — fall back rather than crash.
      return buildTextFragment(resultText);
    }
  }
  if (action === 'list' || action === 'keyPoints') {
    return buildListFragment(resultText);
  }
  return buildTextFragment(resultText);
}

export function insertAIResult(range: Range, action: AIAction, resultText: string): Range {
  range.deleteContents();
  const fragment = buildFragmentForAction(action, resultText);
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
