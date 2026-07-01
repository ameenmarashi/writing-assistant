import { findBlockAncestor } from './toolbarCommands';

export function buildTableElement(headers: string[], rows: string[][]): HTMLTableElement {
  const table = document.createElement('table');
  if (headers.length > 0) {
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const cell of headers) {
      const th = document.createElement('th');
      th.textContent = cell;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }
  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const cell of row) {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return table;
}

/**
 * Inserts a blank table with placeholder column headers, as a sibling after
 * the current paragraph rather than literally at the cursor position. Doing
 * a plain Range.insertNode would nest the table inside whatever inline
 * formatting (a color/font-size span, a legacy <font> tag) happens to
 * surround the cursor, making the whole table inherit that styling.
 */
export function insertBlankTable(range: Range, root: HTMLElement, rows: number, cols: number): Range {
  const headers = Array.from({ length: cols }, (_, i) => `Column ${i + 1}`);
  const bodyRows = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
  const table = buildTableElement(headers, bodyRows);

  const block = findBlockAncestor(range.startContainer, root);
  if (block?.parentNode) {
    block.parentNode.insertBefore(table, block.nextSibling);
  } else {
    range.deleteContents();
    range.insertNode(table);
  }

  const collapsed = document.createRange();
  collapsed.setStartAfter(table);
  collapsed.collapse(true);
  return collapsed;
}
