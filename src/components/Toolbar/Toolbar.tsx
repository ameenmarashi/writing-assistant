import { applyFontFamily, applyFontSize, applyLineHeight } from '../../lib/toolbarCommands';
import { insertBlankTable } from '../../lib/tableInsert';
import { AIActionsMenu } from '../AIActionsMenu/AIActionsMenu';
import { ToolbarDropdown } from './ToolbarDropdown';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
  onExportTxt: () => void;
  onExportDocx: () => void;
}

const FONT_FAMILIES: { value: string; label: string }[] = [
  { value: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif', label: 'Georgia' },
  { value: 'Arial, Helvetica, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Calibri, Candara, "Segoe UI", sans-serif', label: 'Calibri' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
  { value: 'Verdana, Geneva, sans-serif', label: 'Verdana' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

const LINE_HEIGHTS: { value: string; label: string }[] = [
  { value: '1', label: 'Single' },
  { value: '1.15', label: '1.15' },
  { value: '1.5', label: '1.5' },
  { value: '2', label: 'Double' },
];

const TEXT_COLORS = [
  '#000000', '#434343', '#e53935', '#fb8c00', '#fdd835',
  '#43a047', '#1e88e5', '#3949ab', '#8e24aa', '#795548',
];

const HIGHLIGHT_COLORS = ['#fff59d', '#a7f3d0', '#bfdbfe', '#fbcfe8', '#fed7aa'];

function exec(command: string, value?: string): void {
  document.execCommand(command, false, value);
}

function getEditorRange(editableRef: React.RefObject<HTMLDivElement | null>): Range | null {
  const editor = editableRef.current;
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) return null;
  return sel.getRangeAt(0);
}

function setSelectionRange(range: Range): void {
  const sel = window.getSelection();
  if (!sel) return;
  sel.removeAllRanges();
  sel.addRange(range);
}

function ToolbarButton({
  label,
  command,
  value,
  title,
}: {
  label: string;
  command: string;
  value?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      title={title ?? label}
      onMouseDown={(e) => {
        // preventDefault keeps focus/selection in the editor so execCommand
        // applies to the right target instead of nothing.
        e.preventDefault();
        exec(command, value);
      }}
    >
      {label}
    </button>
  );
}

export function Toolbar({ editableRef, onExportTxt, onExportDocx }: ToolbarProps) {
  const handleFontFamily = (value: string) => {
    const editor = editableRef.current;
    const range = getEditorRange(editableRef);
    if (!editor || !range) return;
    const result = applyFontFamily(range, value);
    if (result) setSelectionRange(result);
    editor.focus();
  };

  const handleFontSize = (value: string) => {
    const editor = editableRef.current;
    const range = getEditorRange(editableRef);
    if (!editor || !range) return;
    const result = applyFontSize(range, Number(value));
    if (result) setSelectionRange(result);
    editor.focus();
  };

  const handleLineHeight = (value: string) => {
    const editor = editableRef.current;
    const range = getEditorRange(editableRef);
    if (!editor || !range) return;
    applyLineHeight(range, editor, value);
    editor.focus();
  };

  const handleInsertTable = () => {
    const editor = editableRef.current;
    const range = getEditorRange(editableRef);
    if (!editor || !range) return;
    const collapsed = insertBlankTable(range, editor, 3, 3);
    setSelectionRange(collapsed);
    editor.focus();
  };

  return (
    <div className={styles.toolbar}>
      <ToolbarButton label="Title" command="formatBlock" value="H1" title="Title" />
      <ToolbarButton label="H1" command="formatBlock" value="H2" title="Heading 1" />
      <ToolbarButton label="H2" command="formatBlock" value="H3" title="Heading 2" />
      <ToolbarButton label="H3" command="formatBlock" value="H4" title="Heading 3" />
      <ToolbarButton label="¶" command="formatBlock" value="P" title="Normal text" />
      <div className={styles.divider} />

      <ToolbarDropdown
        label="Font"
        title="Font family"
        options={FONT_FAMILIES.map((f) => ({
          value: f.value,
          content: <span style={{ fontFamily: f.value }}>{f.label}</span>,
        }))}
        onSelect={handleFontFamily}
      />
      <ToolbarDropdown
        label="Size"
        title="Font size"
        options={FONT_SIZES.map((s) => ({ value: String(s), content: `${s} pt` }))}
        onSelect={handleFontSize}
      />
      <div className={styles.divider} />

      <ToolbarButton label="B" command="bold" title="Bold" />
      <ToolbarButton label="I" command="italic" title="Italic" />
      <ToolbarButton label="U" command="underline" title="Underline" />
      <ToolbarButton label="S" command="strikeThrough" title="Strikethrough" />
      <ToolbarButton label="x₂" command="subscript" title="Subscript" />
      <ToolbarButton label="x²" command="superscript" title="Superscript" />
      <div className={styles.divider} />

      <ToolbarDropdown
        label="A"
        title="Text color"
        menuVariant="grid"
        options={TEXT_COLORS.map((c) => ({
          value: c,
          content: <span className={styles.swatchColor} style={{ background: c }} />,
        }))}
        onSelect={(color) => exec('foreColor', color)}
      />
      <ToolbarDropdown
        label="H"
        title="Highlight color"
        menuVariant="grid"
        options={[
          { value: 'transparent', content: <span className={styles.swatchNone} /> },
          ...HIGHLIGHT_COLORS.map((c) => ({
            value: c,
            content: <span className={styles.swatchColor} style={{ background: c }} />,
          })),
        ]}
        onSelect={(color) => exec('hiliteColor', color)}
      />
      <div className={styles.divider} />

      <ToolbarButton label="• List" command="insertUnorderedList" title="Bullet list" />
      <ToolbarButton label="1. List" command="insertOrderedList" title="Numbered list" />
      <ToolbarButton label="⯇⯇" command="outdent" title="Decrease indent" />
      <ToolbarButton label="⯈⯈" command="indent" title="Increase indent" />
      <div className={styles.divider} />

      <ToolbarButton label="⯇" command="justifyLeft" title="Align left" />
      <ToolbarButton label="☰" command="justifyCenter" title="Align center" />
      <ToolbarButton label="⯈" command="justifyRight" title="Align right" />
      <ToolbarButton label="☰☰" command="justifyFull" title="Justify" />
      <div className={styles.divider} />

      <ToolbarDropdown
        label="Spacing"
        title="Line spacing"
        options={LINE_HEIGHTS.map((l) => ({ value: l.value, content: l.label }))}
        onSelect={handleLineHeight}
      />
      <button
        type="button"
        className={styles.button}
        title="Insert table"
        onMouseDown={(e) => {
          e.preventDefault();
          handleInsertTable();
        }}
      >
        ⊞ Table
      </button>
      <div className={styles.divider} />

      <ToolbarButton label="↺" command="undo" title="Undo" />
      <ToolbarButton label="↻" command="redo" title="Redo" />
      <ToolbarButton label="Clear" command="removeFormat" title="Clear formatting" />
      <div className={styles.divider} />

      <AIActionsMenu editableRef={editableRef} />
      <div className={styles.spacer} />
      <button type="button" className={styles.exportButton} onClick={onExportTxt}>
        Download .txt
      </button>
      <button type="button" className={styles.exportButton} onClick={onExportDocx}>
        Download .docx
      </button>
    </div>
  );
}
