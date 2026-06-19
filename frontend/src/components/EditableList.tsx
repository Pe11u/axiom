import { useState, useRef, useEffect, useDeferredValue, useMemo } from 'react';

interface Props {
  items: string[];
  onChange: (items: string[]) => void;
  readOnly?: boolean;
  placeholder?: string;
  addPlaceholder?: string;
  renderMeta?: (item: string, index: number) => React.ReactNode;
}

type Mode = 'visual' | 'text';

const PAGE_SIZE = 200;

export function EditableList({
  items,
  onChange,
  readOnly = false,
  placeholder = 'No items yet.',
  addPlaceholder = 'Add item…',
  renderMeta,
}: Props) {
  const [mode, setMode] = useState<Mode>('visual');
  const [page, setPage] = useState(0);

  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const pageStart = safePage * PAGE_SIZE;
  const pageItems = items.slice(pageStart, pageStart + PAGE_SIZE);

  // Reset to page 0 when the list is replaced entirely (e.g. file load)
  const prevLengthRef = useRef(items.length);
  useEffect(() => {
    if (items.length < prevLengthRef.current) setPage(0);
    prevLengthRef.current = items.length;
  }, [items.length]);

  const [textDraft, setTextDraft] = useState('');
  const [textDirty, setTextDirty] = useState(false);

  useEffect(() => {
    if (mode === 'text') {
      setTextDraft(items.join('\n'));
      setTextDirty(false);
    }
  }, [mode, items]);

  // Defer the expensive line-count computation so the textarea stays responsive
  const deferredDraft = useDeferredValue(textDraft);
  const textLineCount = useMemo(
    () => deferredDraft.split('\n').filter(l => l.trim() && !l.trim().startsWith('#')).length,
    [deferredDraft],
  );

  function applyText() {
    const parsed = textDraft
      .split('\n')
      .map(l => l.trim())
      .filter(l => l !== '' && !l.startsWith('#'));
    onChange(parsed);
    setTextDirty(false);
  }

  const [editingIndex, setEditingIndex] = useState<number | null>(null); // absolute index
  const [editValue, setEditValue] = useState('');
  const [addValue, setAddValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null) editInputRef.current?.focus();
  }, [editingIndex]);

  function startEdit(absIdx: number) {
    if (readOnly) return;
    setEditingIndex(absIdx);
    setEditValue(items[absIdx]);
  }

  function commitEdit(absIdx: number) {
    const trimmed = editValue.trim();
    if (!trimmed) { cancelEdit(); return; }
    const next = [...items];
    next[absIdx] = trimmed;
    onChange(next);
    setEditingIndex(null);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue('');
  }

  function deleteItem(absIdx: number) {
    onChange(items.filter((_, idx) => idx !== absIdx));
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

  function moveItem(absIdx: number, dir: -1 | 1) {
    const j = absIdx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[absIdx], next[j]] = [next[j], next[absIdx]];
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
                {textLineCount} items
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
            {pageItems.map((item, localIdx) => {
              const absIdx = pageStart + localIdx;
              return (
                <div
                  key={absIdx}
                  className="group flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04] hover:bg-white/[0.02]"
                >
                  <span className="text-[10px] text-gray-700 w-8 flex-shrink-0 text-right select-none tabular-nums">{absIdx + 1}</span>

                  {editingIndex === absIdx ? (
                    <input
                      ref={editInputRef}
                      className="flex-1 min-w-0 bg-[#0d0f14] border border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono text-gray-200 focus:outline-none"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(absIdx);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      onBlur={() => commitEdit(absIdx)}
                    />
                  ) : (
                    <span
                      className="flex-1 min-w-0 text-xs font-mono text-gray-300 truncate cursor-text"
                      onDoubleClick={() => startEdit(absIdx)}
                      title="Double-click to edit"
                    >
                      {item}
                    </span>
                  )}

                  {renderMeta && (
                    <span className="flex-shrink-0">{renderMeta(item, absIdx)}</span>
                  )}

                  {!readOnly && editingIndex !== absIdx && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <IconBtn title="Move up" onClick={() => moveItem(absIdx, -1)}>▲</IconBtn>
                      <IconBtn title="Move down" onClick={() => moveItem(absIdx, 1)}>▼</IconBtn>
                      <IconBtn title="Edit" onClick={() => startEdit(absIdx)}>✎</IconBtn>
                      <IconBtn title="Delete" className="hover:text-red-400" onClick={() => deleteItem(absIdx)}>✕</IconBtn>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pageCount > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-white/5 text-[10px] text-gray-600">
              <button
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="px-2 py-0.5 rounded hover:text-gray-300 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                ◀ Prev
              </button>
              <span>{safePage + 1} / {pageCount} <span className="text-gray-700">({PAGE_SIZE} per page)</span></span>
              <button
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage(safePage + 1)}
                className="px-2 py-0.5 rounded hover:text-gray-300 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                Next ▶
              </button>
            </div>
          )}

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
