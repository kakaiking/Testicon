"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, PenLine } from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const MAX_EDITOR_HEIGHT = 260;

export function isEmptyHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const [showToolbar, setShowToolbar] = useState(false);

  const adjustHeight = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_EDITOR_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_EDITOR_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [adjustHeight]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
      adjustHeight();
    }
  }, [value, adjustHeight]);

  const syncValue = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    onChange(el.innerHTML);
    syncingRef.current = false;
  }, [onChange]);

  function exec(command: string) {
    editorRef.current?.focus();
    document.execCommand(command, false);
    syncValue();
    adjustHeight();
  }

  function handleInput() {
    syncValue();
    adjustHeight();
  }

  const toolbar = [
    { command: "bold", icon: Bold, label: "Bold" },
    { command: "italic", icon: Italic, label: "Italic" },
    { command: "underline", icon: Underline, label: "Underline" },
    { command: "insertUnorderedList", icon: List, label: "Bullet list" },
    { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
  ] as const;

  return (
    <div className={`rich-text-editor-wrap${showToolbar ? " rich-text-editor-wrap-toolbar-open" : ""}`}>
      <button
        type="button"
        className={`rich-text-format-toggle${showToolbar ? " rich-text-format-toggle-active" : ""}`}
        onClick={() => setShowToolbar((open) => !open)}
        aria-label={showToolbar ? "Hide formatting toolbar" : "Show formatting toolbar"}
        aria-pressed={showToolbar}
        title={showToolbar ? "Hide formatting" : "Show formatting"}
      >
        <PenLine size={14} strokeWidth={2.25} />
      </button>
      <div className={`rich-text-editor${showToolbar ? " rich-text-editor-toolbar-open" : ""}`}>
        {showToolbar && (
          <div className="rich-text-toolbar">
            {toolbar.map(({ command, icon: Icon, label }) => (
              <button
                key={command}
                type="button"
                className="rich-text-toolbar-btn"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec(command)}
                aria-label={label}
                title={label}
              >
                <Icon size={15} strokeWidth={2.25} />
              </button>
            ))}
          </div>
        )}
        <div className="rich-text-body">
          <div
            ref={editorRef}
            className="rich-text-contenteditable"
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            data-placeholder={placeholder}
            role="textbox"
            aria-multiline="true"
          />
        </div>
      </div>
    </div>
  );
}
