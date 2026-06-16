import { useState, useRef, useEffect } from 'react';

interface Props {
  items: string[];
  onChange: (items: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  addPlaceholder?: string;
  renderMeta?: (item: string, index: number) => React.ReactNode;
}

type Mode = 'visual' | 'text';

export function EditableList({
  items,
  onChange,
  readOnly = false,
  placeholder = 'No items yet.',
  addPlaceholder = 'Add item…',
  renderMeta,
}: Props) {
  const [mode, setMode] = useState<Mode>('visual');

  const [textDraft, setTextDraft] = useState('');
  const [textDirty, setTextDirty] = useState(false);

  useEffect(() => {
    if (mode === 'text') {
      setTextDraft(items.join('\n'));
      setTextDirty(false);
    }
  }, [mode, items]);

  function applyText() {
    const parsed = textDraft
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('#'));
    onChange(parsed);
    setTextDirty(false);
  }

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addValue, setAddValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  function startEdit(i: number) {
    if (readOnly) return;
    setEditingIndex(i);
    setEditValue(items[i]);
  }

  function commitEdit(i: number) {
    const trimmed = editValue.trim();
    if (!trimmed) { cancelEdit(); return; }
    const next = [...items];
    next[i] = trimmed;
    onChange(next);
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue('');
  }

  function deleteItem(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }

  function addItem() {
    const trimmed = addValue.trim();
    if (!trimmed) return;
    const lines = trimmed
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('#'));
    if (lines.length > 0) onChange([...items, ...lines]);
    setAddValue('');
  }

  function moveItem(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 flex-shrink-0">
        <span className="text-[10px] text-gray-500">{items.length} items</span>
        {!readOnly && (
          <div className="flex rounded overflow-hidden border border-white/10 text-[10px]">
            <button
              onClick={() => setMode('visual')}
              className={`px-2 py-0.5 transition-colors ${mode === 'visual' ? 'bg-indigo-500/30 text-indigo-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Visual
            </button>
            <button
              onClick={() => setMode('text')}
              className={`px-2 py-0.5 transition-colors ${mode === 'text' ? 'bg-indigo-500/30 text-indigo-300' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Text
            </button>
          </div>
        )}
      </div>

      {mode === 'text' ? (
        <div className="flex flex-col flex-1 min-h-0 p-3 gap-2">
          <textarea
            className="flex-1 min-h-0 bg-[#0d0f14] border border-white/10 rounded p-2 text-xs font-mono text-gray-200 resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
            value={textDraft}
            onChange={e => { setTextDraft(e.target.value); setTextDirty(true); }}
            placeholder="One item per line. Lines starting with # are ignored."
            spellCheck={false}
          />
          {textDirty && (
            <div className="flex items-center gap-2">
              <button
                onClick={applyText}
                className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => { setTextDraft(items.join('\n')); setTextDirty(false); }}
                className="px-3 py-1 rounded text-xs text-gray-500 hover:text-gray-300"
              >
                Discard
              </button>
              <span className="text-[10px] text-gray-600 ml-auto">
                {textDraft.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length} items
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 && (
              <p className="text-center text-gray-600 text-xs mt-6 px-4">{placeholder}</p>
            )}
            {items.map((item, i) => (
              <div
                key={i}
                className="group flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04] hover:bg-white/[0.02]"
              >
                <span className="text-[10px] text-gray-700 w-6 flex-shrink-0 text-right select-none">{i + 1}</span>

                {editingIndex === i ? (
                  <input
                    ref={editInputRef}
                    className="flex-1 min-w-0 bg-[#0d0f14] border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono text-gray-200 focus:outline-none"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(i);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    onBlur={() => commitEdit(i)}
                  />
                ) : (
                  <span
                    className="flex-1 min-w-0 text-xs font-mono text-gray-300 truncate cursor-text"
                    onDoubleClick={() => startEdit(i)}
                    title="Double-click to edit"
                  >
                    {item}
                  </span>
                )}

                {renderMeta && (
                  <span className="flex-shrink-0">{renderMeta(item, i)}</span>
                )}

                {!readOnly && editingIndex !== i && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <IconBtn title="Move up" onClick={() => moveItem(i, -1)}>▲</IconBtn>
                    <IconBtn title="Move down" onClick={() => moveItem(i, 1)}>▼</IconBtn>
                    <IconBtn title="Edit" onClick={() => startEdit(i)}>✎</IconBtn>
                    <IconBtn title="Delete" className="hover:text-red-400" onClick={() => deleteItem(i)}>✕</IconBtn>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!readOnly && (
            <div className="flex-shrink-0 flex gap-1.5 px-3 py-2 border-t border-white/5">
              <textarea
                rows={2}
                className="flex-1 bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-700"
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); }
                }}
                placeholder={`${addPlaceholder}\n(Enter or paste multiple lines)`}
              />
              <button
                onClick={addItem}
                className="px-3 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 text-xs font-medium transition-colors self-stretch"
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-5 h-5 flex items-center justify-center rounded text-[10px] text-gray-600 hover:text-gray-300 hover:bg-white/5 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
