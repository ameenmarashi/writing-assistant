/**
 * Wraps a Range's contents in a styled <span>. If the Range is collapsed
 * (just a cursor, no selection), inserts an empty span with a zero-width
 * space so subsequent typing inherits the style — the same trick browsers'
 * own execCommand uses internally for "set style for next typed text".
 */
function wrapWithStyledSpan(range: Range, applyStyle: (span: HTMLSpanElement) => void): Range | null {
  const span = document.createElement('span');
  applyStyle(span);

  if (range.collapsed) {
    span.appendChild(document.createTextNode('​'));
    range.insertNode(span);
    const collapsed = document.createRange();
    collapsed.setStart(span.firstChild as Text, 1);
    collapsed.collapse(true);
    return collapsed;
  }

  try {
    range.surroundContents(span);
  } catch {
    return null;
  }
  const collapsed = document.createRange();
  collapsed.setStartAfter(span);
  collapsed.collapse(true);
  return collapsed;
}

export function applyFontFamily(range: Range, fontFamily: string): Range | null {
  return wrapWithStyledSpan(range, (span) => {
    span.style.fontFamily = fontFamily;
  });
}

export function applyFontSize(range: Range, sizePt: number): Range | null {
  return wrapWithStyledSpan(range, (span) => {
    span.style.fontSize = `${sizePt}pt`;
  });
}

export function findBlockAncestor(node: Node, root: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  while (el && el !== root) {
    if (/^(P|H1|H2|H3|H4|LI|DIV|TABLE)$/.test(el.tagName)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** Sets line-height on the block element containing the range's start (the current paragraph). */
export function applyLineHeight(range: Range, root: HTMLElement, lineHeight: string): void {
  const block = findBlockAncestor(range.startContainer, root);
  if (block) block.style.lineHeight = lineHeight;
}
