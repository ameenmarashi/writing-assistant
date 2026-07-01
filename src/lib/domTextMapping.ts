export interface TextSegment {
  node: Text;
  start: number;
  end: number;
}

export interface TextMap {
  text: string;
  segments: TextSegment[];
}

/**
 * Walks all text nodes in document order so offsets always agree exactly
 * with what checkText() saw (unlike innerText, which is layout-dependent).
 */
export function getPlainTextAndMap(root: Node): TextMap {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const segments: TextSegment[] = [];
  let text = '';
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text;
    const data = textNode.data;
    const start = text.length;
    text += data;
    segments.push({ node: textNode, start, end: start + data.length });
  }
  return { text, segments };
}

/**
 * Resolves a plain-text [start, end) offset range to a DOM Range.
 * Returns null if the range spans multiple text nodes (rare, e.g. a match
 * straddling a <b> boundary) — callers should skip rendering that match
 * rather than attempt a multi-node wrap.
 */
export function offsetsToRange(map: TextMap, start: number, end: number): Range | null {
  const segment = map.segments.find((s) => start >= s.start && end <= s.end);
  if (!segment) return null;
  const range = document.createRange();
  range.setStart(segment.node, start - segment.start);
  range.setEnd(segment.node, end - segment.start);
  return range;
}

/** Converts an absolute caret position (node + offset) to a plain-text offset, or null if not found. */
export function nodeOffsetToPlainTextOffset(
  map: TextMap,
  node: Node,
  offset: number,
): number | null {
  const segment = map.segments.find((s) => s.node === node);
  if (!segment) return null;
  return segment.start + offset;
}
