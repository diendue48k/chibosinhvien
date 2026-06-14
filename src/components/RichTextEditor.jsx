import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Button, Tooltip, Divider, Popover, Input, Space } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined, StrikethroughOutlined,
  AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined, ClearOutlined,
  FontColorsOutlined
} from '@ant-design/icons';

const FONT_SIZES = ['12px', '13px', '14px', '15px', '16px', '18px', '20px', '24px'];
const TEXT_COLORS = [
  '#000000', '#c62828', '#1565c0', '#2e7d32', '#6a1b9a', '#e65100',
  '#37474f', '#f57f17', '#00695c', '#ad1457',
];
const HIGHLIGHT_COLORS = [
  '#fff9c4', '#fff3e0', '#e8f5e9', '#e3f2fd', '#fce4ec', '#f3e5f5',
  'transparent'
];

const ToolbarButton = ({ title, icon, onClick, active }) => (
  <Tooltip title={title} placement="top">
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={{
        width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer',
        background: active ? '#e6f4ff' : 'transparent',
        color: active ? '#1890ff' : '#333',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, transition: 'all 0.15s',
      }}
    >
      {icon}
    </button>
  </Tooltip>
);

const Sep = () => (
  <div style={{ width: 1, height: 20, background: '#e8e8e8', margin: '0 4px' }} />
);

const RichTextEditor = ({ value, onChange, placeholder = 'Nhập nội dung...', minHeight = 180 }) => {
  const editorRef = useRef(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkVisible, setLinkVisible] = useState(false);
  const [fontSize, setFontSize] = useState('14px');
  const [textColor, setTextColor] = useState('#000000');
  const [colorVisible, setColorVisible] = useState(false);
  const [highlightVisible, setHighlightVisible] = useState(false);
  const savedSelection = useRef(null);

  // Initialize content from value prop
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, []); // Only on mount

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection.current);
    }
  };

  const exec = useCallback((command, val = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    emitChange();
  }, []);

  const emitChange = useCallback(() => {
    if (editorRef.current && onChange) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInsertLink = () => {
    if (!linkUrl) return;
    restoreSelection();
    editorRef.current?.focus();
    const displayText = linkText || linkUrl;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      document.execCommand('createLink', false, linkUrl);
    } else {
      const linkHtml = `<a href="${linkUrl}" target="_blank" style="color:#096dd9;text-decoration:underline;">${displayText}</a>`;
      document.execCommand('insertHTML', false, linkHtml);
    }
    setLinkVisible(false);
    setLinkUrl('');
    setLinkText('');
    emitChange();
  };

  const applyFontSize = (size) => {
    editorRef.current?.focus();
    // Use a span wrapper to apply font-size since execCommand fontSize only supports 1-7
    document.execCommand('fontSize', false, '7');
    const els = editorRef.current.querySelectorAll('font[size="7"]');
    els.forEach(el => {
      el.removeAttribute('size');
      el.style.fontSize = size;
    });
    setFontSize(size);
    emitChange();
  };

  const linkContent = (
    <div style={{ width: 280, padding: 4 }}>
      <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13 }}>🔗 Chèn đường dẫn</div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3 }}>Text hiển thị (để trống = dùng URL)</div>
        <Input
          size="small"
          value={linkText}
          onChange={e => setLinkText(e.target.value)}
          placeholder="Xem hướng dẫn tại đây..."
        />
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3 }}>URL *</div>
        <Input
          size="small"
          value={linkUrl}
          onChange={e => setLinkUrl(e.target.value)}
          placeholder="https://..."
          onPressEnter={handleInsertLink}
        />
      </div>
      <Button
        type="primary"
        size="small"
        block
        onClick={handleInsertLink}
        disabled={!linkUrl}
        style={{ background: '#c62828', borderColor: '#c62828' }}
      >
        Chèn link
      </Button>
    </div>
  );

  const colorPickerContent = (
    <div>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6 }}>Màu chữ</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 140 }}>
        {TEXT_COLORS.map(c => (
          <div
            key={c}
            onMouseDown={(e) => {
              e.preventDefault();
              exec('foreColor', c);
              setTextColor(c);
              setColorVisible(false);
            }}
            style={{
              width: 20, height: 20, background: c, borderRadius: 3, cursor: 'pointer',
              border: c === textColor ? '2px solid #1890ff' : '1px solid #ddd'
            }}
          />
        ))}
      </div>
    </div>
  );

  const highlightPickerContent = (
    <div>
      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 6 }}>Màu nền (highlight)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, width: 140 }}>
        {HIGHLIGHT_COLORS.map(c => (
          <div
            key={c}
            onMouseDown={(e) => {
              e.preventDefault();
              exec('hiliteColor', c === 'transparent' ? 'transparent' : c);
              setHighlightVisible(false);
            }}
            style={{
              width: 20, height: 20,
              background: c === 'transparent' ? 'repeating-linear-gradient(45deg, #ccc 0, #ccc 2px, #fff 0, #fff 8px)' : c,
              borderRadius: 3, cursor: 'pointer',
              border: '1px solid #ddd'
            }}
            title={c === 'transparent' ? 'Xóa màu nền' : c}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: '6px 8px',
        borderBottom: '1px solid #f0f0f0', background: '#fafafa'
      }}>
        {/* Font size */}
        <select
          value={fontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ height: 26, fontSize: 11, border: '1px solid #d9d9d9', borderRadius: 4, padding: '0 4px', cursor: 'pointer', color: '#333' }}
        >
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <Sep />

        {/* Basic formatting */}
        <ToolbarButton title="Đậm (Ctrl+B)" icon={<BoldOutlined />} onClick={() => exec('bold')} />
        <ToolbarButton title="Nghiêng (Ctrl+I)" icon={<ItalicOutlined />} onClick={() => exec('italic')} />
        <ToolbarButton title="Gạch chân (Ctrl+U)" icon={<UnderlineOutlined />} onClick={() => exec('underline')} />
        <ToolbarButton title="Gạch giữa" icon={<StrikethroughOutlined />} onClick={() => exec('strikeThrough')} />

        <Sep />

        {/* Color */}
        <Popover
          content={colorPickerContent}
          trigger="click"
          open={colorVisible}
          onOpenChange={(v) => { if (v) saveSelection(); setColorVisible(v); }}
        >
          <Tooltip title="Màu chữ">
            <button
              onMouseDown={(e) => e.preventDefault()}
              style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}
            >
              <FontColorsOutlined style={{ fontSize: 13 }} />
              <div style={{ width: 16, height: 3, background: textColor, borderRadius: 1 }} />
            </button>
          </Tooltip>
        </Popover>

        <Popover
          content={highlightPickerContent}
          trigger="click"
          open={highlightVisible}
          onOpenChange={(v) => { if (v) saveSelection(); setHighlightVisible(v); }}
        >
          <Tooltip title="Màu nền (Highlight)">
            <button
              onMouseDown={(e) => e.preventDefault()}
              style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              🖌️
            </button>
          </Tooltip>
        </Popover>

        <Sep />

        {/* Alignment */}
        <ToolbarButton title="Căn trái" icon={<AlignLeftOutlined />} onClick={() => exec('justifyLeft')} />
        <ToolbarButton title="Căn giữa" icon={<AlignCenterOutlined />} onClick={() => exec('justifyCenter')} />
        <ToolbarButton title="Căn phải" icon={<AlignRightOutlined />} onClick={() => exec('justifyRight')} />

        <Sep />

        {/* Lists */}
        <ToolbarButton title="Danh sách có số" icon={<OrderedListOutlined />} onClick={() => exec('insertOrderedList')} />
        <ToolbarButton title="Danh sách gạch đầu dòng" icon={<UnorderedListOutlined />} onClick={() => exec('insertUnorderedList')} />

        <Sep />

        {/* Link */}
        <Popover
          content={linkContent}
          trigger="click"
          open={linkVisible}
          onOpenChange={(v) => { if (v) saveSelection(); setLinkVisible(v); }}
        >
          <Tooltip title="Chèn link">
            <button
              onMouseDown={(e) => e.preventDefault()}
              style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1890ff', fontSize: 13 }}
            >
              <LinkOutlined />
            </button>
          </Tooltip>
        </Popover>

        <Sep />

        {/* Clear formatting */}
        <ToolbarButton title="Xóa định dạng" icon={<ClearOutlined />} onClick={() => exec('removeFormat')} />
      </div>

      {/* Content editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        onKeyUp={emitChange}
        onPaste={(e) => {
          // Paste as HTML (with formatting stripped to plain text option)
          setTimeout(emitChange, 0);
        }}
        data-placeholder={placeholder}
        style={{
          minHeight, padding: '12px 14px', outline: 'none',
          fontSize: 14, lineHeight: 1.8, color: '#333',
          wordBreak: 'break-word',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #bfbfbf;
          pointer-events: none;
        }
        [contenteditable] a { color: #096dd9; text-decoration: underline; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 24px; margin: 4px 0; }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
