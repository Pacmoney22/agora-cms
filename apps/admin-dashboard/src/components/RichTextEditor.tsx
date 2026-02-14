'use client';

import { useRef, useCallback, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onInsertImage?: () => void;
}

// ── Toolbar button component ──

function TBtn({
  label,
  title,
  onClick,
  active,
  className,
}: {
  label: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // prevent losing selection focus
        onClick();
      }}
      title={title}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-xs transition-colors ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      } ${className || ''}`}
    >
      {label}
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-5 w-px bg-gray-200" />;
}

// ── Main editor ──

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  onInsertImage,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [currentBlock, setCurrentBlock] = useState('p');

  // Execute formatting command
  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
    emitChange();
  }, []);

  // Emit HTML change
  const emitChange = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  // Track active formatting at cursor
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('justifyLeft')) formats.add('left');
    if (document.queryCommandState('justifyCenter')) formats.add('center');
    if (document.queryCommandState('justifyRight')) formats.add('right');

    // Detect current block type
    const block = document.queryCommandValue('formatBlock').toLowerCase().replace(/[<>]/g, '');
    setCurrentBlock(block || 'p');

    setActiveFormats(formats);
  }, []);

  // Handle link insertion
  const insertLink = () => {
    if (linkUrl.trim()) {
      exec('createLink', linkUrl.trim());
    }
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const removeLink = () => {
    exec('unlink');
  };

  // Handle paste — strip formatting to just basic HTML
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      // Clean pasted HTML — allow only basic tags
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Remove all style attributes and classes
      temp.querySelectorAll('*').forEach((el) => {
        el.removeAttribute('style');
        el.removeAttribute('class');
        el.removeAttribute('id');
      });

      // Remove script/style tags
      temp.querySelectorAll('script, style, meta, link').forEach((el) => el.remove());

      document.execCommand('insertHTML', false, temp.innerHTML);
    } else {
      document.execCommand('insertText', false, text);
    }
    emitChange();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); exec('bold'); break;
        case 'i': e.preventDefault(); exec('italic'); break;
        case 'u': e.preventDefault(); exec('underline'); break;
        case 'k': e.preventDefault(); setShowLinkInput(true); break;
        case 'z':
          if (e.shiftKey) { e.preventDefault(); exec('redo'); }
          break;
      }
    }
    // Tab inserts indent in lists
    if (e.key === 'Tab') {
      e.preventDefault();
      exec(e.shiftKey ? 'outdent' : 'indent');
    }
  };

  const formatBlock = (tag: string) => {
    exec('formatBlock', `<${tag}>`);
  };

  return (
    <div className="rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 px-2 py-1.5">
        {/* Block type */}
        <select
          value={currentBlock}
          onChange={(e) => formatBlock(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          className="h-7 rounded border border-gray-200 bg-white px-1.5 text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="pre">Code Block</option>
          <option value="blockquote">Blockquote</option>
        </select>

        <Separator />

        {/* Inline formatting */}
        <TBtn label={<strong>B</strong>} title="Bold (Ctrl+B)" onClick={() => exec('bold')} active={activeFormats.has('bold')} />
        <TBtn label={<em>I</em>} title="Italic (Ctrl+I)" onClick={() => exec('italic')} active={activeFormats.has('italic')} />
        <TBtn label={<span className="underline">U</span>} title="Underline (Ctrl+U)" onClick={() => exec('underline')} active={activeFormats.has('underline')} />
        <TBtn label={<span className="line-through">S</span>} title="Strikethrough" onClick={() => exec('strikeThrough')} active={activeFormats.has('strikethrough')} />

        <Separator />

        {/* Lists */}
        <TBtn
          label={<span className="text-[10px]">UL</span>}
          title="Bullet List"
          onClick={() => exec('insertUnorderedList')}
          active={activeFormats.has('ul')}
        />
        <TBtn
          label={<span className="text-[10px]">OL</span>}
          title="Numbered List"
          onClick={() => exec('insertOrderedList')}
          active={activeFormats.has('ol')}
        />

        <Separator />

        {/* Alignment */}
        <TBtn
          label={<span className="text-[10px]">{'\u2261'}</span>}
          title="Align Left"
          onClick={() => exec('justifyLeft')}
          active={activeFormats.has('left')}
        />
        <TBtn
          label={<span className="text-[10px]">{'\u2550'}</span>}
          title="Align Center"
          onClick={() => exec('justifyCenter')}
          active={activeFormats.has('center')}
        />
        <TBtn
          label={<span className="text-[10px]">{'\u2261'}</span>}
          title="Align Right"
          onClick={() => exec('justifyRight')}
          active={activeFormats.has('right')}
          className="scale-x-[-1]"
        />

        <Separator />

        {/* Link */}
        <TBtn
          label={<span className="text-[10px]">{'\uD83D\uDD17'}</span>}
          title="Insert Link (Ctrl+K)"
          onClick={() => setShowLinkInput(!showLinkInput)}
        />
        <TBtn
          label={<span className="text-[10px] line-through">{'\uD83D\uDD17'}</span>}
          title="Remove Link"
          onClick={removeLink}
        />

        {/* Image */}
        {onInsertImage && (
          <TBtn
            label={<span className="text-[10px]">{'\uD83D\uDDBC'}</span>}
            title="Insert Image"
            onClick={onInsertImage}
          />
        )}

        <Separator />

        {/* Block actions */}
        <TBtn
          label={<span className="text-[10px]">HR</span>}
          title="Horizontal Rule"
          onClick={() => exec('insertHorizontalRule')}
        />
        <TBtn
          label={<span className="text-[10px]">{'\u232B'}</span>}
          title="Clear Formatting"
          onClick={() => exec('removeFormat')}
        />

        <div className="flex-1" />

        {/* Undo/Redo */}
        <TBtn
          label={<span className="text-[10px]">{'\u21A9'}</span>}
          title="Undo (Ctrl+Z)"
          onClick={() => exec('undo')}
        />
        <TBtn
          label={<span className="text-[10px]">{'\u21AA'}</span>}
          title="Redo (Ctrl+Shift+Z)"
          onClick={() => exec('redo')}
        />
      </div>

      {/* ── Link input bar ── */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-1.5">
          <span className="text-xs text-gray-500">URL:</span>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); insertLink(); }
              if (e.key === 'Escape') { setShowLinkInput(false); setLinkUrl(''); }
            }}
            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
            placeholder="https://example.com"
            autoFocus
          />
          <button
            onClick={insertLink}
            className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={emitChange}
        onSelect={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className="prose prose-sm max-w-none min-h-[400px] px-4 py-3 focus:outline-none
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-300 [&:empty]:before:pointer-events-none
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3
          [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2
          [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-1
          [&_p]:mb-3 [&_p]:leading-relaxed
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
          [&_li]:mb-1
          [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:my-3
          [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:text-xs [&_pre]:font-mono [&_pre]:my-3 [&_pre]:overflow-x-auto
          [&_code]:bg-gray-100 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_code]:text-pink-600
          [&_a]:text-blue-600 [&_a]:underline [&_a]:hover:text-blue-800
          [&_hr]:border-gray-200 [&_hr]:my-4
          [&_img]:rounded-md [&_img]:max-w-full [&_img]:my-3
          [&_table]:w-full [&_table]:border-collapse [&_table]:my-3
          [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-1.5
          [&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:px-3 [&_th]:py-1.5 [&_th]:font-medium
        "
      />

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-1">
        <span className="text-[10px] text-gray-400">
          {editorRef.current?.innerText?.trim().split(/\s+/).filter(Boolean).length || 0} words
        </span>
        <span className="text-[10px] text-gray-400">
          Ctrl+B Bold &middot; Ctrl+I Italic &middot; Ctrl+K Link
        </span>
      </div>
    </div>
  );
}
