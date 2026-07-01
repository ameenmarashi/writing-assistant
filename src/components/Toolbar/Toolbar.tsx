import { AIActionsMenu } from '../AIActionsMenu/AIActionsMenu';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
  onExportTxt: () => void;
  onExportDocx: () => void;
}

function exec(command: string, value?: string): void {
  document.execCommand(command, false, value);
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
  return (
    <div className={styles.toolbar}>
      <ToolbarButton label="B" command="bold" title="Bold" />
      <ToolbarButton label="I" command="italic" title="Italic" />
      <ToolbarButton label="U" command="underline" title="Underline" />
      <div className={styles.divider} />
      <ToolbarButton label="H1" command="formatBlock" value="H1" title="Heading 1" />
      <ToolbarButton label="H2" command="formatBlock" value="H2" title="Heading 2" />
      <ToolbarButton label="H3" command="formatBlock" value="H3" title="Heading 3" />
      <ToolbarButton label="¶" command="formatBlock" value="P" title="Paragraph" />
      <div className={styles.divider} />
      <ToolbarButton label="• List" command="insertUnorderedList" title="Bullet list" />
      <ToolbarButton label="1. List" command="insertOrderedList" title="Numbered list" />
      <div className={styles.divider} />
      <ToolbarButton label="⯇" command="justifyLeft" title="Align left" />
      <ToolbarButton label="☰" command="justifyCenter" title="Align center" />
      <ToolbarButton label="⯈" command="justifyRight" title="Align right" />
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
