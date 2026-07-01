import { useEffect, useRef, useState } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarDropdownOption {
  value: string;
  content: React.ReactNode;
}

interface ToolbarDropdownProps {
  label: React.ReactNode;
  title?: string;
  options: ToolbarDropdownOption[];
  onSelect: (value: string) => void;
  menuVariant?: 'list' | 'grid';
}

/**
 * A button + absolutely-positioned menu, all wired with onMouseDown +
 * preventDefault so the editor's selection is never lost — unlike a native
 * <select> or <input type="color">, which would steal focus/selection.
 */
export function ToolbarDropdown({ label, title, options, onSelect, menuVariant = 'list' }: ToolbarDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsideMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onOutsideMouseDown);
    return () => window.removeEventListener('mousedown', onOutsideMouseDown);
  }, [open]);

  return (
    <div className={styles.dropdownContainer} ref={containerRef}>
      <button
        type="button"
        className={styles.button}
        title={title}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        {label} ▾
      </button>
      {open && (
        <div className={menuVariant === 'grid' ? styles.dropdownGrid : styles.dropdownMenu}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={menuVariant === 'grid' ? styles.swatch : styles.dropdownItem}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                onSelect(opt.value);
              }}
            >
              {opt.content}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
