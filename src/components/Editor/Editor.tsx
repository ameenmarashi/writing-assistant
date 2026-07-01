import styles from './Editor.module.css';

interface EditorProps {
  editableRef: React.RefObject<HTMLDivElement | null>;
}

export function Editor({ editableRef }: EditorProps) {
  return (
    <div
      ref={editableRef}
      className={styles.page}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-gramm="false"
      role="textbox"
      aria-multiline="true"
      aria-label="Document editor"
    />
  );
}
