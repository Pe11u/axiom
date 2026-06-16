import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Node } from '@xyflow/react';
import {
  CUSTOM_COLORS,
  type RequestNodeData, type ParseNodeData, type RegexExtractData,
  type HtmlSelectData, type XPathSelectData, type JsonExtractData, type SetVariableData,
  type RandomDataData, type ListItemData, type StringOpData,
  type EncodeDecodeData, type HashData, type CryptoAesData,
  type ConditionNodeData, type ConditionBranch, type ConditionRule, type ConditionOp, type ConditionField,
  type LoopData, type WaitData,
  type WebSocketNodeData, type DnsLookupData, type SmtpSendData, type ImapFetchData,
  type TcpConnectData, type SshExecuteData, type FtpSftpData,
  type FileReadData, type FileWriteData,
  type JsonBuildData, type ListOpData, type DateTimeData, type MathOpData,
  type TryCatchData,
  type WebhookData, type CaptchaSolverData, type JsExecuteData, type TerminalData,
  type TextEncoding, TEXT_ENCODINGS,
} from './nodeTypes';

export type VarGroup = { label: string; items: { display: string; value: string }[] };

interface Props {
  node: Node | null;
  onChange: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  availableVars?: VarGroup[];
}

const TYPE_LABELS: Record<string, string> = {
  http_request:  'HTTP Request',
  websocket:     'WebSocket',
  dns_lookup:    'DNS Lookup',
  smtp_send:     'SMTP Send',
  imap_fetch:    'IMAP Fetch',
  parse:         'Parse',
  regex_extract: 'Regex Extract',
  html_select:   'HTML Select',
  xpath_select:  'XPath Select',
  json_extract:  'JSON Extract',
  set_variable:  'Set Variable',
  random_data:   'Random',
  list_item:     'List Item',
  user_agent:    'User Agent',
  string_op:     'String Op',
  encode_decode: 'Encode / Decode',
  hash:          'Hash',
  crypto_aes:    'AES Crypto',
  condition:     'Condition',
  if:            'If',
  loop:          'Loop',
  wait:          'Wait',
  output:        'Output',
  tcp_connect:   'TCP Connect',
  ssh_execute:   'SSH Execute',
  ftp_sftp:      'FTP / SFTP',
  file_read:     'File Read',
  file_write:    'File Write',
  json_build:    'JSON Build',
  list_op:       'List Op',
  date_time:     'Date / Time',
  math_op:       'Math',
  try_catch:     'Try / Catch',
  webhook:       'Webhook',
  captcha_solver:'Captcha Solver',
  js_execute:    'JS Execute',
  terminal:      'Terminal',
  fingerprint:   'Fingerprint',
  cookie_jar:    'Cookie Jar',
  rate_limiter:  'Rate Limiter',
};

export function NodeConfigPanel({ node, onChange, onDelete, availableVars = [] }: Props) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
        <span className="text-2xl opacity-20 select-none">◈</span>
        <p className="text-xs text-gray-600">Click a node to edit its properties</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 flex-shrink-0">
        <span className="text-xs font-semibold text-gray-300">{TYPE_LABELS[node.type ?? ''] ?? node.type}</span>
        <button onClick={() => onDelete(node.id)}
          className="text-xs px-2 py-0.5 rounded text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          Delete
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {node.type === 'http_request'  && <RequestConfig    node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'websocket'     && <WebSocketConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'dns_lookup'    && <DnsLookupConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'smtp_send'     && <SmtpSendConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'imap_fetch'    && <ImapFetchConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'parse'         && <ParseConfig      node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'regex_extract' && <RegexConfig      node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'html_select'   && <HtmlSelectConfig node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'xpath_select'  && <XPathConfig       node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'json_extract'  && <JsonExtractConfig node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'set_variable'  && <SetVarConfig      node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'random_data'   && <RandomConfig     node={node} onChange={onChange} />}
        {node.type === 'list_item'     && <ListItemConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'string_op'     && <StringOpConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'encode_decode' && <EncDecConfig     node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'hash'          && <HashConfig       node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'crypto_aes'    && <CryptoAesConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'output'        && <ConditionConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'condition'     && <ConditionConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'if'            && <ConditionConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'loop'          && <LoopConfig       node={node} onChange={onChange} vars={availableVars} />}

        {node.type === 'wait'          && <WaitConfig        node={node} onChange={onChange} />}
        {node.type === 'tcp_connect'   && <TcpConnectConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'ssh_execute'   && <SshExecuteConfig  node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'ftp_sftp'      && <FtpSftpConfig     node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'file_read'     && <FileReadConfig    node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'file_write'    && <FileWriteConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'json_build'    && <JsonBuildConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'list_op'       && <ListOpConfig      node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'date_time'     && <DateTimeConfig    node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'math_op'       && <MathOpConfig      node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'try_catch'     && <TryCatchConfig    node={node} onChange={onChange} />}
        {node.type === 'webhook'       && <WebhookConfig     node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'captcha_solver'&& <CaptchaConfig     node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'js_execute'    && <JsExecuteConfig   node={node} onChange={onChange} vars={availableVars} />}
        {node.type === 'terminal'      && <TerminalConfig     node={node} onChange={onChange} />}
      </div>
    </div>
  );
}


function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</label>
        {hint && <span className="text-[9px] text-gray-700">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inp = 'bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 w-full focus:outline-none focus:border-indigo-500';
const sel = 'bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 w-full focus:outline-none focus:border-indigo-500';
const ta  = 'bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs font-mono text-gray-200 w-full focus:outline-none focus:border-indigo-500 resize-none leading-relaxed';

function VarHint() {
  return <span className="text-[9px] text-gray-700">supports {'{{var}}'}</span>;
}

function EncodingSelect({ value, onChange }: { value: TextEncoding; onChange: (v: TextEncoding) => void }) {
  return (
    <Field label="Output Encoding">
      <select className={sel} value={value || 'utf8'} onChange={e => onChange(e.target.value as TextEncoding)}>
        {TEXT_ENCODINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>
    </Field>
  );
}

function SaveAsField({ varName, encodeOutput, capture, onVarName, onEncode, onCapture, placeholder, label }: {
  varName: string; encodeOutput?: boolean; capture?: boolean;
  onVarName: (v: string) => void; onEncode: (v: boolean) => void; onCapture: (v: boolean) => void;
  placeholder?: string; label?: string;
}) {
  return (
    <>
      <Field label={label ?? 'Save As'}>
        <input className={`${inp} font-mono`} value={varName} onChange={e => onVarName(e.target.value)} placeholder={placeholder ?? 'result'} />
      </Field>
      <div className="flex items-center gap-4 mb-3 -mt-1">
        <div className="flex items-center gap-1.5">
          <input type="checkbox" checked={capture !== false} onChange={e => onCapture(e.target.checked)} className="nodrag accent-indigo-500" />
          <span className="text-[10px] text-gray-500 cursor-pointer select-none nodrag">Capture</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="checkbox" checked={!!encodeOutput} onChange={e => onEncode(e.target.checked)} className="nodrag accent-indigo-500" />
          <span className="text-[10px] text-gray-500 cursor-pointer select-none nodrag">URL-encode</span>
        </div>
      </div>
    </>
  );
}

function VarDropdown({ groups, dropRef, onPick, anchorRef }: {
  groups: VarGroup[];
  dropRef: React.RefObject<HTMLDivElement>;
  onPick: (value: string, e: React.MouseEvent) => void;
  anchorRef: React.RefObject<HTMLDivElement>;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dropHeight = 208;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow >= dropHeight || spaceBelow >= r.top
      ? r.bottom + 2
      : r.top - dropHeight - 2;
    setPos({ top, left: r.left, width: r.width });
  }, [anchorRef]);

  function toggle(label: string) {
    setExpanded(s => { const n = new Set(s); n.has(label) ? n.delete(label) : n.add(label); return n; });
  }

  return createPortal(
    <div ref={dropRef}
      className="fixed z-[9999] bg-[#0d0f14] border border-white/10 rounded shadow-lg max-h-52 overflow-y-auto"
      style={{ top: pos.top, left: pos.left, width: pos.width }}>
      {groups.map(group => (
        <div key={group.label}>
          <button type="button" onClick={() => toggle(group.label)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:bg-white/5 transition-colors">
            <span>{group.label}</span>
            <span className="text-gray-700 text-[8px]">{expanded.has(group.label) ? '▲' : '▼'}</span>
          </button>
          {expanded.has(group.label) && group.items.map(item => (
            <button key={item.value} type="button"
              onMouseDown={e => onPick(item.value, e)}
              className="w-full text-left px-4 py-1 text-xs font-mono text-gray-400 hover:bg-white/5 hover:text-indigo-300 truncate">
              {`{{${item.display}}}`}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  );
}

function useVarDropdown(open: boolean, setOpen: (v: boolean) => void, dropRef: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!dropRef.current?.contains(e.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open, setOpen, dropRef]);
}

function VarSelect({ value, onChange, vars, placeholder }: {
  value: string; onChange: (v: string) => void; vars: VarGroup[]; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const dropRef   = useRef<HTMLDivElement>(null!);
  const anchorRef = useRef<HTMLDivElement>(null!);
  useVarDropdown(open, setOpen, dropRef);

  const hasVars = vars.some(g => g.items.length > 0);

  function insertVar(v: string, e: React.MouseEvent) {
    e.preventDefault();
    const el  = inputRef.current;
    const tag = `{{${v}}}`;
    const start = el?.selectionStart ?? value.length;
    const end   = el?.selectionEnd   ?? value.length;
    onChange(value.slice(0, start) + tag + value.slice(end));
    requestAnimationFrame(() => {
      el?.setSelectionRange(start + tag.length, start + tag.length);
      el?.focus();
    });
    setOpen(false);
  }

  return (
    <div className="relative" ref={anchorRef}>
      <div className="flex gap-1">
        <input ref={inputRef} className={`${inp} font-mono flex-1`}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? ''} />
        {hasVars && (
          <button type="button" onClick={() => setOpen(o => !o)} title="Insert variable"
            className={`px-1.5 rounded border text-[10px] transition-colors flex-shrink-0 ${
              open ? 'text-indigo-300 border-indigo-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-indigo-400 hover:border-indigo-500/40'}`}>
            {'{}'}
          </button>
        )}
      </div>
      {open && <VarDropdown groups={vars} dropRef={dropRef} onPick={insertVar} anchorRef={anchorRef} />}
    </div>
  );
}

function VarAppender({ vars, current, onChange }: {
  vars: VarGroup[]; current: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropRef   = useRef<HTMLDivElement>(null!);
  const anchorRef = useRef<HTMLDivElement>(null!);
  useVarDropdown(open, setOpen, dropRef);

  const hasVars = vars.some(g => g.items.length > 0);
  if (!hasVars) return null;

  function appendVar(v: string, e: React.MouseEvent) {
    e.preventDefault();
    onChange(current + (current ? ' ' : '') + `{{${v}}}`);
    setOpen(false);
  }

  return (
    <div className="relative mt-1" ref={anchorRef}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full text-[9px] rounded border px-2 py-0.5 transition-colors text-left ${
          open ? 'text-indigo-300 border-indigo-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:border-indigo-500/40 hover:text-gray-400'}`}>
        Insert variable…
      </button>
      {open && <VarDropdown groups={vars} dropRef={dropRef} onPick={appendVar} anchorRef={anchorRef} />}
    </div>
  );
}


const CONTENT_TYPES = [
  'application/x-www-form-urlencoded',
  'application/json',
  'multipart/form-data',
  'text/plain',
  'application/xml',
  'application/octet-stream',
];

function RequestConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as RequestNodeData;
  function patch(p: Partial<RequestNodeData>) { onChange(node.id, { ...node.data, ...p }); }
  const reqType  = d.requestType || 'standard';
  const hasBody  = ['POST','PUT','PATCH','DELETE'].includes(d.method||'GET');
  const isBasic  = reqType === 'basicauth';

  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>

      <div className="flex gap-2 mb-3">
        <div className="w-24 flex-shrink-0">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Method</label>
          <select className={sel} value={d.method||'GET'} onChange={e=>patch({method:e.target.value})}>
            {['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].map(m=><option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">URL</label>
          <VarSelect value={d.url||''} onChange={v=>patch({url:v})} vars={vars} placeholder="https://example.com/path" />
        </div>
      </div>

      <Field label="Request Type">
        <div className="flex gap-1">
          {(['standard','basicauth','multipart','raw'] as const).map(v=>(
            <button key={v} onClick={()=>patch({requestType:v})}
              className={`flex-1 py-1 rounded text-[10px] border transition-colors ${reqType===v?'text-indigo-300 border-indigo-500/60 bg-white/5':'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {v==='basicauth'?'Basic Auth':v==='multipart'?'Multipart':v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
      </Field>

      {isBasic && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Username</label>
            <VarSelect value={d.basicAuthUser||''} onChange={v=>patch({basicAuthUser:v})} vars={vars} placeholder="user" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <VarSelect value={d.basicAuthPass||''} onChange={v=>patch({basicAuthPass:v})} vars={vars} placeholder="pass" />
          </div>
        </div>
      )}

      {hasBody && !isBasic && (
        <>
          <Field label="POST Data / Body" hint="supports {{var}}">
            <textarea className={`${ta} font-mono`} rows={4} spellCheck={false}
              value={d.body||''} onChange={e=>patch({body:e.target.value})}
              placeholder={reqType==='standard'?'login_id={{USER}}&password={{PASS}}':reqType==='multipart'?'field=value\nfile=@/path/to/file.txt':'raw body…'} />
            <VarAppender vars={vars} current={d.body||''} onChange={v=>patch({body:v})} />
          </Field>
          <div className="flex gap-2 mb-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Content-Type</label>
              <select className={sel} value={d.contentType||'application/x-www-form-urlencoded'}
                onChange={e=>patch({contentType:e.target.value})}>
                {CONTENT_TYPES.map(ct=><option key={ct}>{ct}</option>)}
                <option value="custom">Custom…</option>
              </select>
            </div>
            {(d.contentType==='custom') && (
              <div className="flex-1">
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Custom value</label>
                <input className={inp} value={''} onChange={e=>patch({contentType:e.target.value})} placeholder="text/csv; charset=utf-8" />
              </div>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer mb-1 flex-shrink-0">
              <input type="checkbox" checked={!!d.encodeContent} onChange={e=>patch({encodeContent:e.target.checked})} className="accent-indigo-500" />
              <span className="text-[10px] text-gray-400">URL-encode</span>
            </label>
          </div>
        </>
      )}

      <Field label="Custom Headers" hint="one per line: Name: Value">
        <textarea className={`${ta} font-mono`} rows={4} spellCheck={false}
          value={d.headers||''} onChange={e=>patch({headers:e.target.value})}
          placeholder={"Pragma: no-cache\nAccept: */*"} />
        <VarAppender vars={vars} current={d.headers||''} onChange={v=>patch({headers:v})} />
      </Field>

      <Field label="Custom Cookies" hint="raw cookie string">
        <textarea className={`${ta} font-mono`} rows={2} spellCheck={false}
          value={d.cookies||''} onChange={e=>patch({cookies:e.target.value})}
          placeholder={"session=abc; csrf=xyz"} />
        <VarAppender vars={vars} current={d.cookies||''} onChange={v=>patch({cookies:v})} />
      </Field>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {([
          ['followRedirects',  'Auto Redirect',     true ],
          ['acceptEncoding',   'Accept-Encoding',   true ],
          ['readResponseBody', 'Read Resp. Source', true ],
          ['encodeContent',    'Encode Content',    false],
        ] as [keyof RequestNodeData, string, boolean][]).filter(([k])=>!( hasBody && k==='encodeContent')).map(([key, label, def])=>(
          <label key={key} className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={d[key]!==undefined ? !!d[key] : def}
              onChange={e=>patch({[key]:e.target.checked} as Partial<RequestNodeData>)} className="accent-indigo-500" />
            <span className="text-[10px] text-gray-400">{label}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">HTTP Version</label>
          <select className={sel} value={d.httpVersion||'1.1'} onChange={e=>patch({httpVersion:e.target.value as '1.1'|'2'})}>
            <option value="1.1">HTTP/1.1</option><option value="2">HTTP/2</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">TLS Profile</label>
          <select className={sel} value={d.tlsProfile||'chrome_146'} onChange={e=>patch({tlsProfile:e.target.value})}>
            {['chrome_146','firefox_135','safari_16','random'].map(p=><option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Timeout (ms)</label>
          <input type="number" className={inp} min={500} step={500} value={d.timeout??30000} onChange={e=>patch({timeout:Number(e.target.value)})} />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Response Type</label>
          <select className={sel} value={d.responseType||'string'} onChange={e=>patch({responseType:e.target.value as 'string'|'base64'})}>
            <option value="string">String (UTF-8)</option><option value="base64">Base64</option>
          </select>
        </div>
      </div>

      <Field label="User-Agent" hint="supports {{var}}">
        <textarea className={`${ta} font-mono`} rows={2} spellCheck={false}
          value={d.userAgent??''} onChange={e=>patch({userAgent:e.target.value})}
          placeholder="Mozilla/5.0 …" />
        <VarAppender vars={vars} current={d.userAgent??''} onChange={v=>patch({userAgent:v})} />
      </Field>
    </>
  );
}


function ParseConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as ParseNodeData;
  function patch(p: Partial<ParseNodeData>) { onChange(node.id, { ...node.data, ...p }); }
  const isBetween = (d.parseType || 'between') === 'between';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Input" hint="empty = HTTP body">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} />
      </Field>
      <Field label="Mode">
        <div className="flex gap-1.5">
          {(['between','json'] as const).map(t=>(
            <button key={t} onClick={()=>patch({parseType:t})}
              className={`flex-1 py-1 rounded text-xs font-medium border transition-colors ${
                (d.parseType||'between')===t ? 'text-purple-300 border-purple-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {t==='between'?'Between':'JSON'}
            </button>
          ))}
        </div>
      </Field>
      {isBetween ? (
        <>
          <Field label="Start String" hint="text before value">
            <VarSelect value={d.startStr||''} onChange={v=>patch({startStr:v})} vars={vars} placeholder='"token":"' />
          </Field>
          <Field label="End String" hint="text after value">
            <VarSelect value={d.endStr||''} onChange={v=>patch({endStr:v})} vars={vars} placeholder='",' />
          </Field>
          <Field label="Occurrence">
            <div className="flex gap-1.5">
              {(['first','last','all'] as const).map(o=>(
                <button key={o} onClick={()=>patch({occurrence:o})}
                  className={`flex-1 py-1 rounded text-xs capitalize border transition-colors ${
                    (d.occurrence||'first')===o ? 'text-purple-300 border-purple-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
                  {o}
                </button>
              ))}
            </div>
          </Field>
        </>
      ) : (
        <Field label="JSON Key" hint="dot notation">
          <VarSelect value={d.jsonKey||''} onChange={v=>patch({jsonKey:v})} vars={vars} placeholder="data.user.token" />
        </Field>
      )}
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="token" />
    </>
  );
}

function RegexConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as RegexExtractData;
  function patch(p: Partial<RegexExtractData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Input" hint="empty = HTTP body">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} />
      </Field>
      <Field label="Pattern">
        <VarSelect value={d.pattern||''} onChange={v=>patch({pattern:v})} vars={vars} placeholder="(?<=token=)[^&]+" />
        <p className="text-[9px] text-gray-700 mt-0.5">Use capture groups: wrap the target in (…)</p>
      </Field>
      <Field label="Capture Group" hint="0 = full match">
        <input type="number" min={0} className={inp} value={d.group??0} onChange={e=>patch({group:Number(e.target.value)})} />
      </Field>
      <Field label="Flags">
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={!!d.multiline} onChange={e=>patch({multiline:e.target.checked})} className="accent-indigo-500" />
            Multiline (m)
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={!!d.caseInsensitive} onChange={e=>patch({caseInsensitive:e.target.checked})} className="accent-indigo-500" />
            Case-insensitive (i)
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={!!d.allMatches} onChange={e=>patch({allMatches:e.target.checked})} className="accent-indigo-500" />
            All matches ▶ array
          </label>
        </div>
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="match" />
    </>
  );
}

function HtmlSelectConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as HtmlSelectData;
  function patch(p: Partial<HtmlSelectData>) { onChange(node.id, { ...node.data, ...p }); }
  const commonAttrs = ['text','html','href','src','value','data-id','class','id'];
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Input" hint="empty = HTTP body">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} />
      </Field>
      <Field label="CSS Selector">
        <VarSelect value={d.selector||''} onChange={v=>patch({selector:v})} vars={vars} placeholder=".token-value" />
      </Field>
      <Field label="Attribute">
        <select className={sel} value={d.attribute||'text'} onChange={e=>patch({attribute:e.target.value})}>
          {commonAttrs.map(a=><option key={a}>{a}</option>)}
          <option value="custom">custom…</option>
        </select>
        {d.attribute==='custom' && (
          <input className={`${inp} font-mono mt-1`} placeholder="data-token" onChange={e=>patch({attribute:e.target.value})} />
        )}
      </Field>
      <Field label="Match Index" hint="0 = first">
        <input type="number" min={0} className={inp} value={d.index??0} onChange={e=>patch({index:Number(e.target.value)})} />
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="element" />
    </>
  );
}

function XPathConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as XPathSelectData;
  function patch(p: Partial<XPathSelectData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Input" hint="empty = HTTP body">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} />
      </Field>
      <Field label="XPath">
        <VarSelect value={d.xpath||''} onChange={v=>patch({xpath:v})} vars={vars} placeholder="//div[@class='token']/text()" />
      </Field>
      <Field label="Match Index" hint="0 = first">
        <input type="number" min={0} className={inp} value={d.index??0} onChange={e=>patch({index:Number(e.target.value)})} />
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="node" />
    </>
  );
}


function JsonExtractConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as JsonExtractData;
  function patch(p: Partial<JsonExtractData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Input" hint="empty = HTTP body">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} />
      </Field>
      <Field label="Path" hint="dot notation + [n] for arrays">
        <VarSelect value={d.path||''} onChange={v=>patch({path:v})} vars={vars} placeholder="data.users[0].name" />
        <p className="text-[9px] text-gray-700 mt-0.5">e.g. results[2].token or just results to get full array</p>
      </Field>
      <div className="flex items-center gap-2 mb-3">
        <input type="checkbox" checked={!!d.allMatches} onChange={e=>patch({allMatches:e.target.checked})} className="nodrag accent-indigo-500" />
        <span className="text-[10px] text-gray-400 cursor-pointer select-none nodrag">All matches (collect across array items)</span>
      </div>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="extracted" />
    </>
  );
}

function SetVarConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as SetVariableData;
  function patch(p: Partial<SetVariableData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <SaveAsField label="Variable Name" varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="myVar" />
      <Field label="Value" hint="{{var}} interpolation">
        <textarea className={ta} rows={3} value={d.value||''} onChange={e=>patch({value:e.target.value})} placeholder="Hello {{name}}" spellCheck={false} />
        <VarAppender vars={vars} current={d.value||''} onChange={v=>patch({value:v})} />
      </Field>
    </>
  );
}

const RANDOM_TYPES = [
  {v:'string',      l:'Random String'},
  {v:'integer',     l:'Integer'},
  {v:'float',       l:'Float'},
  {v:'email',       l:'Email Address'},
  {v:'credit_card', l:'Credit Card'},
  {v:'username',    l:'Username'},
  {v:'password',    l:'Password'},
  {v:'uuid',        l:'UUID v4'},
  {v:'name',        l:'Full Name'},
  {v:'phone',       l:'Phone Number'},
  {v:'ip',          l:'IP Address (v4)'},
  {v:'ipv6',        l:'IP Address (v6)'},
  {v:'mac_address', l:'MAC Address'},
  {v:'hex_color',   l:'Hex Color'},
  {v:'domain',      l:'Domain Name'},
  {v:'user_agent',  l:'User Agent'},
];

const CARD_TYPES = [
  {v:'random',     l:'Random'},
  {v:'visa',       l:'Visa'},
  {v:'mastercard', l:'Mastercard'},
  {v:'amex',       l:'American Express'},
  {v:'discover',   l:'Discover'},
  {v:'jcb',        l:'JCB'},
];
const CHARSETS = [
  { v: 'alphanum',    l: 'Alphanumeric (a-z A-Z 0-9)' },
  { v: 'alpha',       l: 'Alpha (a-z A-Z)' },
  { v: 'numeric',     l: 'Numeric (0-9)' },
  { v: 'hex',         l: 'Hex (0-9 a-f)' },
  { v: 'upper_alpha', l: 'Uppercase (A-Z)' },
  { v: 'lower_alpha', l: 'Lowercase (a-z)' },
  { v: 'unicode',     l: 'All Unicode' },
  { v: 'custom',      l: 'Custom…' },
];

function RandomConfig({ node, onChange }: { node: Node; onChange: Props['onChange'] }) {
  const d = node.data as RandomDataData;
  function patch(p: Partial<RandomDataData>) { onChange(node.id, { ...node.data, ...p }); }
  const charset = d.charset || 'alphanum';
  const isCustom = charset === 'custom';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Type">
        <select className={sel} value={d.dataType||'string'} onChange={e=>patch({dataType:e.target.value as RandomDataData['dataType']})}>
          {RANDOM_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </Field>
      {d.dataType==='string' && (
        <>
          <Field label="Length"><input type="number" min={1} max={512} className={inp} value={d.length||8} onChange={e=>patch({length:Number(e.target.value)})} /></Field>
          <Field label="Charset">
            <select className={sel} value={charset} onChange={e=>patch({charset:e.target.value})}>
              {CHARSETS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
            {isCustom && (
              <input className={`${inp} mt-1 font-mono`}
                value={d.customCharset||''}
                onChange={e=>patch({customCharset:e.target.value})}
                placeholder="e.g. abc123!@#" />
            )}
          </Field>
        </>
      )}
      {(d.dataType==='integer'||d.dataType==='float') && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min"><input type="number" className={inp} value={d.min??0}   onChange={e=>patch({min:Number(e.target.value)})} /></Field>
          <Field label="Max"><input type="number" className={inp} value={d.max??100} onChange={e=>patch({max:Number(e.target.value)})} /></Field>
        </div>
      )}
      {d.dataType==='email' && (
        <Field label="Domain" hint="optional — leave empty for random">
          <input className={`${inp} font-mono`} value={d.domain||''} onChange={e=>patch({domain:e.target.value})} placeholder="example.com" />
        </Field>
      )}
      {d.dataType==='credit_card' && (
        <Field label="Card Type">
          <select className={sel} value={d.cardType||'random'} onChange={e=>patch({cardType:e.target.value})}>
            {CARD_TYPES.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
        </Field>
      )}
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="rand" />
    </>
  );
}

function ListItemConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as ListItemData;
  function patch(p: Partial<ListItemData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="List Variable" hint="pick or type">
        <VarSelect value={d.listVar||''} onChange={v=>patch({listVar:v})} vars={vars} placeholder="myList" />
      </Field>
      <Field label="Pick Mode">
        <select className={sel} value={d.pickMode||'random'} onChange={e=>patch({pickMode:e.target.value as ListItemData['pickMode']})}>
          <option value="first">First item</option>
          <option value="last">Last item</option>
          <option value="random">Random item</option>
          <option value="index">By index</option>
        </select>
      </Field>
      {d.pickMode==='index' && (
        <Field label="Index"><input type="number" min={0} className={inp} value={d.index??0} onChange={e=>patch({index:Number(e.target.value)})} /></Field>
      )}
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="item" />
    </>
  );
}


const STRING_OPS = [
  {v:'upper',          l:'UPPER CASE'},         {v:'lower',          l:'lower case'},
  {v:'trim',           l:'Trim (both ends)'},   {v:'trim_start',     l:'Trim Start'},
  {v:'trim_end',       l:'Trim End'},            {v:'replace',        l:'Replace'},
  {v:'regex_replace',  l:'Regex Replace'},       {v:'remove',         l:'Remove substring'},
  {v:'split',          l:'Split'},               {v:'join',           l:'Join'},
  {v:'substring',      l:'Substring'},           {v:'length',         l:'Length'},
  {v:'count',          l:'Count occurrences'},   {v:'reverse',        l:'Reverse'},
  {v:'repeat',         l:'Repeat'},              {v:'pad_left',       l:'Pad Left'},
  {v:'pad_right',      l:'Pad Right'},           {v:'starts_with',    l:'Starts With'},
  {v:'ends_with',      l:'Ends With'},           {v:'contains',       l:'Contains'},
  {v:'index_of',       l:'Index Of'},            {v:'extract_between',l:'Extract Between'},
];

const STRING_OP_HINTS: Record<string, { p1?: string; p2?: string }> = {
  replace:        { p1: 'Search', p2: 'Replace with' },
  regex_replace:  { p1: 'Regex pattern', p2: 'Replace with' },
  remove:         { p1: 'Substring to remove' },
  split:          { p1: 'Delimiter' },
  join:           { p1: 'Separator' },
  substring:      { p1: 'Start index', p2: 'End index (optional)' },
  count:          { p1: 'Substring to count' },
  repeat:         { p1: 'Times' },
  pad_left:       { p1: 'Pad char (default space)', p2: 'Total width' },
  pad_right:      { p1: 'Pad char (default space)', p2: 'Total width' },
  starts_with:    { p1: 'Prefix' },
  ends_with:      { p1: 'Suffix' },
  contains:       { p1: 'Substring' },
  index_of:       { p1: 'Substring' },
  extract_between:{ p1: 'Start string', p2: 'End string' },
};

function StringOpConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as StringOpData;
  function patch(p: Partial<StringOpData>) { onChange(node.id, { ...node.data, ...p }); }
  const hints = STRING_OP_HINTS[d.operation || 'replace'] ?? {};
  const needsOutput = !['length','starts_with','ends_with','contains','index_of'].includes(d.operation);
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <select className={sel} value={d.operation||'replace'} onChange={e=>patch({operation:e.target.value as StringOpData['operation']})}>
          {STRING_OPS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field label="Input" hint="pick var or type">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} placeholder="{{value}}" />
      </Field>
      {hints.p1 && <Field label={hints.p1}>
        <VarSelect value={d.param1||''} onChange={v=>patch({param1:v})} vars={vars} placeholder="" />
      </Field>}
      {hints.p2 && <Field label={hints.p2}>
        <VarSelect value={d.param2||''} onChange={v=>patch({param2:v})} vars={vars} placeholder="" />
      </Field>}
      {needsOutput && <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="result" />}
    </>
  );
}

const ENC_OPS = [
  {v:'base64_enc',     l:'Base64 Encode'},     {v:'base64_dec',    l:'Base64 Decode'},
  {v:'base64_url_enc', l:'Base64-URL Encode'}, {v:'base64_url_dec',l:'Base64-URL Decode'},
  {v:'url_enc',        l:'URL Encode'},        {v:'url_dec',       l:'URL Decode'},
  {v:'html_enc',       l:'HTML Encode'},       {v:'html_dec',      l:'HTML Decode'},
  {v:'hex_enc',        l:'HEX Encode'},        {v:'hex_dec',       l:'HEX Decode'},
  {v:'json_stringify', l:'JSON Stringify'},    {v:'json_parse',    l:'JSON Parse'},
  {v:'jwt_decode',     l:'JWT Decode (payload)'},
];

function EncDecConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as EncodeDecodeData;
  function patch(p: Partial<EncodeDecodeData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <select className={sel} value={d.operation||'base64_enc'} onChange={e=>patch({operation:e.target.value as EncodeDecodeData['operation']})}>
          {ENC_OPS.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
      </Field>
      <Field label="Input" hint="pick var or type">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} placeholder="{{value}}" />
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="result" />
    </>
  );
}

const HASH_ALGOS = [
  {v:'md5',        l:'MD5'},
  {v:'sha1',       l:'SHA-1'},
  {v:'sha256',     l:'SHA-256'},
  {v:'sha512',     l:'SHA-512'},
  {v:'hmac_md5',   l:'HMAC-MD5'},
  {v:'hmac_sha1',  l:'HMAC-SHA1'},
  {v:'hmac_sha256',l:'HMAC-SHA256'},
  {v:'hmac_sha512',l:'HMAC-SHA512'},
];

function HashConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as HashData;
  function patch(p: Partial<HashData>) { onChange(node.id, { ...node.data, ...p }); }
  const isHmac = (d.algorithm||'').startsWith('hmac');
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Algorithm">
        <select className={sel} value={d.algorithm||'sha256'} onChange={e=>patch({algorithm:e.target.value as HashData['algorithm']})}>
          {HASH_ALGOS.map(a=><option key={a.v} value={a.v}>{a.l}</option>)}
        </select>
      </Field>
      <Field label="Input" hint="pick var or type">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} placeholder="{{value}}" />
      </Field>
      {isHmac && <Field label="HMAC Key" hint="pick var or type">
        <VarSelect value={d.key||''} onChange={v=>patch({key:v})} vars={vars} placeholder="secret key" />
      </Field>}
      <Field label="Output">
        <div className="flex gap-1.5 mb-1.5">
          {([false,true] as const).map(uc=>(
            <button key={String(uc)} onClick={()=>patch({uppercase:uc})}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${
                !!d.uppercase===uc ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {uc ? 'UPPERCASE' : 'lowercase'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['hex','base64'] as const).map(enc=>(
            <button key={enc} onClick={()=>patch({outputEncoding:enc})}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${
                (d.outputEncoding||'hex')===enc ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {enc}
            </button>
          ))}
        </div>
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="hash" />
    </>
  );
}

function CryptoAesConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as CryptoAesData;
  function patch(p: Partial<CryptoAesData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <div className="flex gap-1.5">
          {(['encrypt','decrypt'] as const).map(op=>(
            <button key={op} onClick={()=>patch({operation:op})}
              className={`flex-1 py-1 rounded text-xs capitalize border transition-colors ${
                d.operation===op ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {op}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Mode">
          <select className={sel} value={d.mode||'CBC'} onChange={e=>patch({mode:e.target.value as CryptoAesData['mode']})}>
            {['ECB','CBC','GCM'].map(m=><option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Key Size">
          <select className={sel} value={d.keySize||128} onChange={e=>patch({keySize:Number(e.target.value) as 128|256})}>
            <option value={128}>128-bit</option>
            <option value={256}>256-bit</option>
          </select>
        </Field>
      </div>
      <Field label="Input" hint="pick var or type">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} placeholder="{{plaintext}}" />
      </Field>
      {d.operation==='decrypt' && (
        <Field label="Input Encoding">
          <div className="flex gap-1.5">
            {(['utf8','hex','base64'] as const).map(enc=>(
              <button key={enc} onClick={()=>patch({inputEncoding:enc})}
                className={`flex-1 py-1 rounded text-xs border transition-colors ${
                  (d.inputEncoding||'utf8')===enc ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
                {enc}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Key" hint="pick var or type">
        <VarSelect value={d.key||''} onChange={v=>patch({key:v})} vars={vars} placeholder="{{aesKey}}" />
      </Field>
      <Field label="Key Encoding">
        <div className="flex gap-1.5">
          {(['utf8','hex','base64'] as const).map(enc=>(
            <button key={enc} onClick={()=>patch({keyEncoding:enc})}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${
                (d.keyEncoding||'utf8')===enc ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {enc}
            </button>
          ))}
        </div>
      </Field>
      {d.mode!=='ECB' && <Field label="IV" hint="pick var or type">
        <VarSelect value={d.iv||''} onChange={v=>patch({iv:v})} vars={vars} placeholder="{{iv}}" />
      </Field>}
      {d.operation==='encrypt' && (
        <Field label="Output Encoding">
          <div className="flex gap-1.5">
            {(['base64','hex'] as const).map(enc=>(
              <button key={enc} onClick={()=>patch({outputEncoding:enc})}
                className={`flex-1 py-1 rounded text-xs border transition-colors ${
                  (d.outputEncoding||'base64')===enc ? 'text-orange-300 border-orange-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
                {enc}
              </button>
            ))}
          </div>
        </Field>
      )}
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="result" />
    </>
  );
}


const FIELD_OPTIONS = [
  {value:'status_code',    label:'Status Code'},
  {value:'body',           label:'Response Body (Source)'},
  {value:'response_header',label:'Response Header'},
  {value:'variable',       label:'Variable'},
];
const OP_OPTIONS = [
  {value:'eq',          label:'== equals'},
  {value:'neq',         label:'!= not equals'},
  {value:'contains',    label:'contains'},
  {value:'not_contains',label:"doesn't contain"},
  {value:'gt',          label:'> greater than'},
  {value:'lt',          label:'< less than'},
  {value:'gte',         label:'>= greater or equal'},
  {value:'lte',         label:'<= less or equal'},
  {value:'regex',       label:'~ matches regex'},
  {value:'is_empty',    label:'is empty'},
  {value:'not_empty',   label:'is not empty'},
];
const NO_VALUE_OPS = new Set(['is_empty','not_empty']);

const BRANCH_COLORS = ['#22c55e','#ef4444','#f59e0b','#3b82f6','#a855f7','#ec4899','#14b8a6','#f97316'];

function RuleRow({ rule, branchIdx, ruleIdx, branches, vars, onChange: onNodeChange, nodeId, nodeData }:
  { rule: ConditionRule; branchIdx: number; ruleIdx: number; branches: ConditionBranch[];
    vars: VarGroup[]; onChange: Props['onChange']; nodeId: string; nodeData: Record<string, unknown> }) {
  function patchRule(p: Partial<ConditionRule>) {
    const next = branches.map((b, bi) => bi !== branchIdx ? b : {
      ...b, rules: b.rules.map((r, ri) => ri !== ruleIdx ? r : { ...r, ...p })
    });
    onNodeChange(nodeId, { ...nodeData, branches: next });
  }
  function removeRule() {
    const next = branches.map((b, bi) => bi !== branchIdx ? b : {
      ...b, rules: b.rules.filter((_, ri) => ri !== ruleIdx)
    });
    onNodeChange(nodeId, { ...nodeData, branches: next });
  }
  const needsName = rule.field === 'response_header' || rule.field === 'variable';
  return (
    <div className="bg-white/5 rounded p-2 space-y-1.5 text-[11px]">
      <div className="flex gap-1 items-center">
        <select className={`${sel} flex-1`} value={rule.field} onChange={e => patchRule({ field: e.target.value as ConditionField, fieldName: '' })}>
          {FIELD_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button onClick={removeRule} className="text-gray-600 hover:text-red-400 px-1 nodrag">✕</button>
      </div>
      {needsName && (
        <VarSelect value={rule.fieldName || ''} onChange={v => patchRule({ fieldName: v })} vars={vars}
          placeholder={rule.field === 'response_header' ? 'Header name' : 'Variable name'} />
      )}
      <div className="flex gap-1">
        <select className={`${sel} flex-1`} value={rule.op} onChange={e => patchRule({ op: e.target.value as ConditionOp })}>
          {OP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {!NO_VALUE_OPS.has(rule.op) && (
        <VarSelect value={rule.value || ''} onChange={v => patchRule({ value: v })} vars={vars}
          placeholder={rule.field === 'status_code' ? '200' : 'expected value'} />
      )}
    </div>
  );
}

function ConditionConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as ConditionNodeData;
  const branches: ConditionBranch[] = Array.isArray(d.branches) ? d.branches : [];
  function patchBranch(bi: number, p: Partial<ConditionBranch>) {
    const next = branches.map((b, i) => i !== bi ? b : { ...b, ...p });
    onChange(node.id, { ...node.data, branches: next });
  }
  function addBranch() {
    const color = BRANCH_COLORS[branches.length % BRANCH_COLORS.length];
    const next: ConditionBranch[] = [...branches, { id: `branch_${Date.now()}`, label: 'NEW', color, logic: 'and', rules: [] }];
    onChange(node.id, { ...node.data, branches: next });
  }
  function removeBranch(bi: number) {
    onChange(node.id, { ...node.data, branches: branches.filter((_, i) => i !== bi) });
  }
  function addRule(bi: number) {
    const next = branches.map((b, i) => i !== bi ? b : {
      ...b, rules: [...b.rules, { field: 'status_code' as ConditionField, fieldName: '', op: 'eq' as ConditionOp, value: '' }]
    });
    onChange(node.id, { ...node.data, branches: next });
  }

  return (
    <>
      <Field label="Label"><input className={inp} value={d.label || ''} onChange={e => onChange(node.id, { ...node.data, label: e.target.value })} /></Field>
      <div className="space-y-3 mt-1">
        {branches.map((branch, bi) => (
          <div key={branch.id} className="rounded border border-white/10 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-1.5" style={{ borderLeft: `3px solid ${branch.color}` }}>
              <input
                className="bg-transparent text-[11px] font-semibold w-20 outline-none border-b border-transparent focus:border-white/30 nodrag"
                value={branch.label}
                onChange={e => patchBranch(bi, { label: e.target.value.toUpperCase() })}
              />
              <div className="flex gap-0.5 ml-auto items-center">
                {([['and','AND'],['or','OR']] as const).map(([v, l]) => (
                  <button key={v} onClick={() => patchBranch(bi, { logic: v })}
                    className={`px-1.5 py-0.5 rounded text-[9px] border transition-colors nodrag ${branch.logic === v ? 'border-white/30 text-white bg-white/10' : 'border-white/10 text-gray-600 hover:text-gray-400'}`}>
                    {l}
                  </button>
                ))}
                <input type="color" value={branch.color} onChange={e => patchBranch(bi, { color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 nodrag ml-1" title="Branch color" />
                <button onClick={() => removeBranch(bi)} className="text-gray-600 hover:text-red-400 px-1 text-[11px] nodrag ml-0.5">✕</button>
              </div>
            </div>
            <div className="px-2 pb-2 space-y-1.5">
              {branch.rules.length > 1 && (
                <div className="text-[9px] text-gray-600 px-1">
                  Match <span className="text-white">{branch.logic.toUpperCase()}</span> of the following:
                </div>
              )}
              {branch.rules.map((rule, ri) => (
                <RuleRow key={ri} rule={rule} branchIdx={bi} ruleIdx={ri}
                  branches={branches} vars={vars} onChange={onChange} nodeId={node.id} nodeData={node.data as Record<string, unknown>} />
              ))}
              <button onClick={() => addRule(bi)}
                className="w-full text-center text-[10px] text-gray-600 hover:text-gray-300 border border-dashed border-white/10 hover:border-white/20 rounded py-1 transition-colors nodrag">
                + add rule
              </button>
            </div>
          </div>
        ))}
        <button onClick={addBranch} disabled={branches.length >= 5}
          className={`w-full text-center text-[10px] border border-dashed rounded py-1.5 transition-colors nodrag ${branches.length >= 5 ? 'text-gray-700 border-white/5 cursor-not-allowed' : 'text-gray-500 hover:text-gray-300 border-white/10 hover:border-white/20'}`}>
          {branches.length >= 5 ? 'max 5 branches' : '+ add branch'}
        </button>
      </div>
      <p className="text-[9px] text-gray-700 mt-1">Branches are checked top to bottom; first match wins. Unmatched nodes stop execution.</p>
    </>
  );
}

function LoopConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as LoopData;
  function patch(p: Partial<LoopData>) { onChange(node.id, { ...node.data, ...p }); }
  const isList = (d.loopMode || 'count') === 'list';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Mode">
        <div className="flex gap-1.5">
          {([['count','Count'],['list','For Each']] as const).map(([v,l])=>(
            <button key={v} onClick={()=>patch({loopMode:v})}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${
                (d.loopMode||'count')===v ? 'text-amber-300 border-amber-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {l}
            </button>
          ))}
        </div>
      </Field>
      {isList ? (
        <>
          <Field label="List Variable" hint="array to iterate">
            <VarSelect value={d.listVar||''} onChange={v=>patch({listVar:v})} vars={vars} placeholder="myList" />
          </Field>
          <Field label="Item Variable" hint="current element">
            <input className={`${inp} font-mono`} value={d.itemVar||''} onChange={e=>patch({itemVar:e.target.value})} placeholder="item" />
          </Field>
        </>
      ) : (
        <Field label="Repeat Times">
          <input type="number" min={1} max={100000} className={inp} value={d.times||10} onChange={e=>patch({times:Number(e.target.value)})} />
        </Field>
      )}
      <Field label="Index Variable" hint="0-based counter each iteration">
        <input className={`${inp} font-mono`} value={d.indexVar||''} onChange={e=>patch({indexVar:e.target.value})} placeholder="i" />
      </Field>
    </>
  );
}

function WaitConfig({ node, onChange }: { node: Node; onChange: Props['onChange'] }) {
  const d = node.data as WaitData;
  function patch(p: Partial<WaitData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Delay (ms)">
        <input type="number" min={0} className={inp} value={d.ms||1000} onChange={e=>patch({ms:Number(e.target.value)})} />
      </Field>
      <Field label="Jitter ±ms" hint="random variance">
        <input type="number" min={0} className={inp} value={d.jitter||0} onChange={e=>patch({jitter:Number(e.target.value)})} />
        <p className="text-[9px] text-gray-700 mt-0.5">Final delay = {d.ms||1000} ± {d.jitter||0} ms (random)</p>
      </Field>
    </>
  );
}


export type UaEntry = { label: string; ua: string };
export type UaBrowser = { versions: string[]; platforms: Record<string, UaEntry[]> };

export const UA_PRESETS: Record<string, UaBrowser> = {
  chrome: {
    versions: ['131', '124', '120', '114'],
    platforms: {
      '131': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' },
        { label: 'Android 14',    ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.81 Mobile Safari/537.36' },
      ],
      '124': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
        { label: 'Android 14',    ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36' },
      ],
      '120': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        { label: 'macOS 13',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        { label: 'Android 13',    ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36' },
      ],
      '114': [
        { label: 'Windows 10',    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
        { label: 'macOS 12',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36' },
      ],
    },
  },
  firefox: {
    versions: ['128', '125', '121', '115'],
    platforms: {
      '128': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0' },
        { label: 'Android 14',    ua: 'Mozilla/5.0 (Android 14; Mobile; rv:128.0) Gecko/128.0 Firefox/128.0' },
      ],
      '125': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0' },
        { label: 'Android 13',    ua: 'Mozilla/5.0 (Android 13; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0' },
      ],
      '121': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0' },
        { label: 'macOS 13',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13.6; rv:121.0) Gecko/20100101 Firefox/121.0' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0' },
      ],
      '115': [
        { label: 'Windows 10',    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:115.0) Gecko/20100101 Firefox/115.0' },
        { label: 'macOS 12',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12.6; rv:115.0) Gecko/20100101 Firefox/115.0' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:115.0) Gecko/20100101 Firefox/115.0' },
      ],
    },
  },
  safari: {
    versions: ['17', '16', '15'],
    platforms: {
      '17': [
        { label: 'macOS 14',     ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15' },
        { label: 'iPhone iOS 17',ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1' },
        { label: 'iPad iOS 17',  ua: 'Mozilla/5.0 (iPad; CPU OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1' },
      ],
      '16': [
        { label: 'macOS 13',     ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15' },
        { label: 'iPhone iOS 16',ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_7_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
        { label: 'iPad iOS 16',  ua: 'Mozilla/5.0 (iPad; CPU OS 16_7_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' },
      ],
      '15': [
        { label: 'macOS 12',     ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15' },
        { label: 'iPhone iOS 15',ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1' },
      ],
    },
  },
  edge: {
    versions: ['131', '124', '120'],
    platforms: {
      '131': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
        { label: 'Linux x86_64',  ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0' },
      ],
      '124': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0' },
        { label: 'macOS 14',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0' },
      ],
      '120': [
        { label: 'Windows 10/11', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
        { label: 'macOS 13',      ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0' },
      ],
    },
  },
};

export const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Chrome', firefox: 'Firefox', safari: 'Safari', edge: 'Edge',
};

void (VarHint);


function WebSocketConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as WebSocketNodeData;
  function patch(p: Partial<WebSocketNodeData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="URL" hint="supports {{var}}">
        <VarSelect value={d.url||''} onChange={v=>patch({url:v})} vars={vars} placeholder="wss://example.com/ws" />
      </Field>
      <Field label="Sub-Protocol" hint="optional, e.g. graphql-ws">
        <input className={inp} value={d.protocol||''} onChange={e=>patch({protocol:e.target.value})} placeholder="graphql-ws" />
      </Field>
      <Field label="Headers" hint="one per line: Name: Value">
        <textarea className={`${ta} font-mono`} rows={3} spellCheck={false}
          value={d.headers||''} onChange={e=>patch({headers:e.target.value})}
          placeholder={"Authorization: Bearer token\nOrigin: https://example.com"} />
      </Field>
      <Field label="Send Message" hint="supports {{var}}">
        <textarea className={ta} rows={3} value={d.sendMessage||''} onChange={e=>patch({sendMessage:e.target.value})} placeholder='{"event":"subscribe"}' spellCheck={false} />
        <VarAppender vars={vars} current={d.sendMessage||''} onChange={v=>patch({sendMessage:v})} />
      </Field>
      <Field label="Wait for Reply">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!d.waitForMessage} onChange={e=>patch({waitForMessage:e.target.checked})} className="accent-cyan-500" />
          <span className="text-xs text-gray-400">Wait for a message after sending</span>
        </label>
      </Field>
      <Field label="Timeout (ms)">
        <input type="number" className={inp} value={d.timeout??10000} min={500} step={500} onChange={e=>patch({timeout:Number(e.target.value)})} />
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="wsMsg" />
    </>
  );
}


function DnsLookupConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as DnsLookupData;
  function patch(p: Partial<DnsLookupData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Domain" hint="supports {{var}}">
        <VarSelect value={d.domain||''} onChange={v=>patch({domain:v})} vars={vars} placeholder="example.com" />
      </Field>
      <Field label="Record Type">
        <select className={sel} value={d.recordType||'A'} onChange={e=>patch({recordType:e.target.value as DnsLookupData['recordType']})}>
          {(['A','AAAA','MX','TXT','CNAME','NS','SOA','PTR'] as const).map(t=><option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="DNS Server" hint="empty = system default">
        <VarSelect value={d.server||''} onChange={v=>patch({server:v})} vars={vars} placeholder="8.8.8.8" />
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="dnsResult" />
    </>
  );
}


function SmtpSendConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as SmtpSendData;
  function patch(p: Partial<SmtpSendData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Host" hint="supports {{var}}">
        <VarSelect value={d.host||''} onChange={v=>patch({host:v})} vars={vars} placeholder="smtp.gmail.com" />
      </Field>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Port</label>
          <input type="number" className={inp} value={d.port??587} min={1} max={65535} onChange={e=>patch({port:Number(e.target.value)})} />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Security</label>
          <select className={sel} value={d.secureMode||'starttls'} onChange={e=>patch({secureMode:e.target.value as SmtpSendData['secureMode']})}>
            <option value="starttls">STARTTLS (587)</option>
            <option value="ssl">SSL/TLS (465)</option>
            <option value="none">None (25)</option>
          </select>
        </div>
      </div>
      <Field label="Username" hint="supports {{var}}">
        <VarSelect value={d.username||''} onChange={v=>patch({username:v})} vars={vars} placeholder="user@example.com" />
      </Field>
      <Field label="Password" hint="supports {{var}}">
        <VarSelect value={d.password||''} onChange={v=>patch({password:v})} vars={vars} placeholder="app password" />
      </Field>
      <Field label="From" hint="supports {{var}}">
        <VarSelect value={d.from||''} onChange={v=>patch({from:v})} vars={vars} placeholder="sender@example.com" />
      </Field>
      <Field label="To" hint="comma-separated, supports {{var}}">
        <VarSelect value={d.to||''} onChange={v=>patch({to:v})} vars={vars} placeholder="a@example.com, b@example.com" />
      </Field>
      <Field label="CC" hint="supports {{var}}">
        <VarSelect value={d.cc||''} onChange={v=>patch({cc:v})} vars={vars} placeholder="cc@example.com" />
      </Field>
      <Field label="BCC" hint="supports {{var}}">
        <VarSelect value={d.bcc||''} onChange={v=>patch({bcc:v})} vars={vars} placeholder="bcc@example.com" />
      </Field>
      <Field label="Reply-To" hint="supports {{var}}">
        <VarSelect value={d.replyTo||''} onChange={v=>patch({replyTo:v})} vars={vars} placeholder="reply@example.com" />
      </Field>
      <Field label="Subject" hint="supports {{var}}">
        <VarSelect value={d.subject||''} onChange={v=>patch({subject:v})} vars={vars} placeholder="Hello" />
      </Field>
      <Field label="Body" hint="supports {{var}}">
        <textarea className={ta} rows={4} value={d.body||''} onChange={e=>patch({body:e.target.value})} placeholder="Message body…" spellCheck={false} />
        <VarAppender vars={vars} current={d.body||''} onChange={v=>patch({body:v})} />
      </Field>
      <Field label="Format">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!d.isHtml} onChange={e=>patch({isHtml:e.target.checked})} className="accent-emerald-500" />
          <span className="text-xs text-gray-400">Send as HTML</span>
        </label>
      </Field>
    </>
  );
}


function ImapFetchConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as ImapFetchData;
  function patch(p: Partial<ImapFetchData>) { onChange(node.id, { ...node.data, ...p }); }
  const needsSearchValue = d.searchField !== 'unseen' && d.searchField !== 'all';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Host" hint="supports {{var}}">
        <VarSelect value={d.host||''} onChange={v=>patch({host:v})} vars={vars} placeholder="imap.gmail.com" />
      </Field>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Port</label>
          <input type="number" className={inp} value={d.port??993} min={1} max={65535} onChange={e=>patch({port:Number(e.target.value)})} />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Security</label>
          <select className={sel} value={d.secureMode||'ssl'} onChange={e=>patch({secureMode:e.target.value as ImapFetchData['secureMode']})}>
            <option value="ssl">SSL/TLS (993)</option>
            <option value="starttls">STARTTLS (143)</option>
            <option value="none">None (143)</option>
          </select>
        </div>
      </div>
      <Field label="Username" hint="supports {{var}}">
        <VarSelect value={d.username||''} onChange={v=>patch({username:v})} vars={vars} placeholder="user@example.com" />
      </Field>
      <Field label="Password" hint="supports {{var}}">
        <VarSelect value={d.password||''} onChange={v=>patch({password:v})} vars={vars} placeholder="app password" />
      </Field>
      <Field label="Folder" hint="supports {{var}}">
        <VarSelect value={d.folder||'INBOX'} onChange={v=>patch({folder:v})} vars={vars} placeholder="INBOX" />
      </Field>
      <Field label="Search By">
        <select className={sel} value={d.searchField||'unseen'} onChange={e=>patch({searchField:e.target.value as ImapFetchData['searchField']})}>
          <option value="unseen">Unread</option>
          <option value="all">All</option>
          <option value="subject">Subject contains</option>
          <option value="from">From contains</option>
          <option value="body">Body contains</option>
        </select>
      </Field>
      {needsSearchValue && (
        <Field label="Search Value" hint="supports {{var}}">
          <VarSelect value={d.searchValue||''} onChange={v=>patch({searchValue:v})} vars={vars} placeholder="keyword" />
        </Field>
      )}
      <Field label="Fetch Field">
        <select className={sel} value={d.fetchField||'text'} onChange={e=>patch({fetchField:e.target.value as ImapFetchData['fetchField']})}>
          <option value="text">Plain Text Body</option>
          <option value="html">HTML Body</option>
          <option value="subject">Subject</option>
          <option value="from">From</option>
          <option value="date">Date</option>
        </select>
      </Field>
      <Field label="Message Index" hint="0 = latest">
        <input type="number" className={inp} value={d.index??0} min={0} onChange={e=>patch({index:Number(e.target.value)})} />
      </Field>
      <Field label="After Fetch">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!d.markAsRead} onChange={e=>patch({markAsRead:e.target.checked})} className="accent-teal-500" />
          <span className="text-xs text-gray-400">Mark message as read</span>
        </label>
      </Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="email" />
    </>
  );
}

function TcpConnectConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as TcpConnectData;
  function patch(p: Partial<TcpConnectData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <div className="flex gap-2 mb-3">
        <div className="flex-[2]">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Host</label>
          <VarSelect value={d.host||''} onChange={v=>patch({host:v})} vars={vars} placeholder="127.0.0.1" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Port</label>
          <input type="number" className={inp} value={d.port??80} min={1} max={65535} onChange={e=>patch({port:Number(e.target.value)})} />
        </div>
      </div>
      <Field label="Encoding">
        <select className={sel} value={d.encoding||'utf8'} onChange={e=>patch({encoding:e.target.value as TcpConnectData['encoding']})}>
          <option value="utf8">UTF-8</option><option value="hex">Hex</option><option value="base64">Base64</option>
        </select>
      </Field>
      <Field label="Timeout (ms)">
        <input type="number" className={inp} value={d.timeout??5000} min={0} onChange={e=>patch({timeout:Number(e.target.value)})} />
      </Field>
      <Field label="Send Data" hint="supports {{var}}">
        <VarSelect value={d.sendData||''} onChange={v=>patch({sendData:v})} vars={vars} placeholder="HELLO\r\n" />
      </Field>
      <Field label="Save Response As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="tcpResp" /></Field>
    </>
  );
}

function SshExecuteConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as SshExecuteData;
  function patch(p: Partial<SshExecuteData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <div className="flex gap-2 mb-3">
        <div className="flex-[2]">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Host</label>
          <VarSelect value={d.host||''} onChange={v=>patch({host:v})} vars={vars} placeholder="ssh.example.com" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Port</label>
          <input type="number" className={inp} value={d.port??22} min={1} max={65535} onChange={e=>patch({port:Number(e.target.value)})} />
        </div>
      </div>
      <Field label="Username"><VarSelect value={d.username||''} onChange={v=>patch({username:v})} vars={vars} placeholder="root" /></Field>
      <Field label="Auth">
        <div className="flex gap-1.5">
          {(['password','key'] as const).map(v=>(
            <button key={v} onClick={()=>patch({authMode:v})}
              className={`flex-1 py-1 rounded text-xs border transition-colors ${(d.authMode||'password')===v?'text-lime-300 border-lime-500/60 bg-white/5':'text-gray-600 border-white/10 hover:text-gray-400'}`}>
              {v==='password'?'Password':'Private Key'}
            </button>
          ))}
        </div>
      </Field>
      {(d.authMode||'password')==='password'
        ? <Field label="Password"><VarSelect value={d.password||''} onChange={v=>patch({password:v})} vars={vars} placeholder="••••••" /></Field>
        : <Field label="Private Key (PEM)"><textarea className={`${inp} font-mono h-20 resize-none`} value={d.privateKey||''} onChange={e=>patch({privateKey:e.target.value})} placeholder="-----BEGIN RSA PRIVATE KEY-----" /></Field>
      }
      <Field label="Command" hint="supports {{var}}">
        <VarSelect value={d.command||''} onChange={v=>patch({command:v})} vars={vars} placeholder="whoami" />
      </Field>
      <EncodingSelect value={(d.outputEncoding || 'utf8') as TextEncoding} onChange={v => patch({ outputEncoding: v })} />
      <Field label="Save Output As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="sshOut" /></Field>
    </>
  );
}

function FtpSftpConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as FtpSftpData;
  function patch(p: Partial<FtpSftpData>) { onChange(node.id, { ...node.data, ...p }); }
  const defaultPort = d.protocol==='sftp'?22:d.protocol==='ftps'?990:21;
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Protocol">
        <select className={sel} value={d.protocol||'ftp'} onChange={e=>patch({protocol:e.target.value as FtpSftpData['protocol']})}>
          <option value="ftp">FTP (21)</option><option value="ftps">FTPS (990)</option><option value="sftp">SFTP (22)</option>
        </select>
      </Field>
      <div className="flex gap-2 mb-3">
        <div className="flex-[2]">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Host</label>
          <VarSelect value={d.host||''} onChange={v=>patch({host:v})} vars={vars} placeholder="ftp.example.com" />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Port</label>
          <input type="number" className={inp} value={d.port??defaultPort} min={1} max={65535} onChange={e=>patch({port:Number(e.target.value)})} />
        </div>
      </div>
      <Field label="Username"><VarSelect value={d.username||''} onChange={v=>patch({username:v})} vars={vars} /></Field>
      <Field label="Password"><VarSelect value={d.password||''} onChange={v=>patch({password:v})} vars={vars} /></Field>
      <Field label="Operation">
        <select className={sel} value={d.operation||'list'} onChange={e=>patch({operation:e.target.value as FtpSftpData['operation']})}>
          <option value="list">List Directory</option><option value="download">Download File</option>
          <option value="upload">Upload File</option><option value="delete">Delete File</option>
          <option value="mkdir">Make Directory</option><option value="rename">Rename</option>
        </select>
      </Field>
      <Field label="Remote Path" hint="supports {{var}}"><VarSelect value={d.remotePath||''} onChange={v=>patch({remotePath:v})} vars={vars} placeholder="/" /></Field>
      {['upload','download'].includes(d.operation||'list') && (
        <Field label="Local Path" hint="supports {{var}}"><VarSelect value={d.localPath||''} onChange={v=>patch({localPath:v})} vars={vars} placeholder="/tmp/file.txt" /></Field>
      )}
      <Field label="Save Result As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="ftpResult" /></Field>
    </>
  );
}

function FileReadConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as FileReadData;
  function patch(p: Partial<FileReadData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="File Path" hint="supports {{var}}"><VarSelect value={d.path||''} onChange={v=>patch({path:v})} vars={vars} placeholder="/data/list.txt" /></Field>
      <Field label="Read Mode">
        <select className={sel} value={d.mode||'lines'} onChange={e=>patch({mode:e.target.value as FileReadData['mode']})}>
          <option value="full">Full Content</option><option value="lines">All Lines (array)</option>
          <option value="line_at">Specific Line</option><option value="random_line">Random Line</option>
        </select>
      </Field>
      {d.mode==='line_at' && (
        <Field label="Line Index" hint="0-based"><input type="number" className={inp} value={d.index??0} min={0} onChange={e=>patch({index:Number(e.target.value)})} /></Field>
      )}
      <EncodingSelect value={(d.encoding || 'utf8') as TextEncoding} onChange={v => patch({ encoding: v })} />
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="fileData" />
    </>
  );
}

function FileWriteConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as FileWriteData;
  function patch(p: Partial<FileWriteData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="File Path" hint="supports {{var}}"><VarSelect value={d.path||''} onChange={v=>patch({path:v})} vars={vars} placeholder="/output/results.txt" /></Field>
      <Field label="Write Mode">
        <select className={sel} value={d.mode||'append'} onChange={e=>patch({mode:e.target.value as FileWriteData['mode']})}>
          <option value="append">Append</option><option value="write">Overwrite</option><option value="prepend">Prepend</option>
        </select>
      </Field>
      <Field label="Content" hint="supports {{var}}">
        <VarSelect value={d.content||''} onChange={v=>patch({content:v})} vars={vars} placeholder="{{result}}" />
      </Field>
      <EncodingSelect value={(d.encoding || 'utf8') as TextEncoding} onChange={v => patch({ encoding: v })} />
      <Field label="Options">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!d.newline} onChange={e=>patch({newline:e.target.checked})} className="accent-sky-500" />
          <span className="text-xs text-gray-400">Add newline after content</span>
        </label>
      </Field>
    </>
  );
}

function JsonBuildConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as JsonBuildData;
  function patch(p: Partial<JsonBuildData>) { onChange(node.id, { ...node.data, ...p }); }
  const fields: { key: string; value: string }[] = (() => { try { return JSON.parse(d.fields || '[]'); } catch { return []; } })();
  function setFields(f: { key: string; value: string }[]) { patch({ fields: JSON.stringify(f) }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider">Fields</label>
          <button onClick={()=>setFields([...fields,{key:'',value:''}])}
            className="text-[10px] text-fuchsia-400 hover:text-fuchsia-300 px-1">+ Add</button>
        </div>
        <div className="space-y-1.5">
          {fields.map((f,i)=>(
            <div key={i} className="flex gap-1.5 items-center">
              <input className={`${inp} flex-1 font-mono`} placeholder="key" value={f.key}
                onChange={e=>{const n=[...fields];n[i]={...n[i],key:e.target.value};setFields(n);}} />
              <div className="flex-[2]">
                <VarSelect value={f.value} onChange={v=>{const n=[...fields];n[i]={...n[i],value:v};setFields(n);}} vars={vars} placeholder="{{var}} or value" />
              </div>
              <button onClick={()=>setFields(fields.filter((_,j)=>j!==i))}
                className="text-gray-600 hover:text-red-400 text-xs px-1">✕</button>
            </div>
          ))}
        </div>
      </div>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="json" />
    </>
  );
}

function ListOpConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as ListOpData;
  function patch(p: Partial<ListOpData>) { onChange(node.id, { ...node.data, ...p }); }
  const op = d.operation || 'append';
  const needsValue   = ['append','prepend','remove_value','filter_contains','contains','index_of','merge'].includes(op);
  const needsIndex   = ['remove_at','get_at'].includes(op);
  const needsJoin    = op === 'join';
  const needsSort    = op === 'sort';
  const needsSlice   = op === 'slice';
  const producesVar  = !['create'].includes(op);
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <select className={sel} value={op} onChange={e=>patch({operation:e.target.value as ListOpData['operation']})}>
          <option value="create">Create (new list)</option>
          <option value="append">Append item</option><option value="prepend">Prepend item</option>
          <option value="remove_at">Remove at index</option><option value="remove_value">Remove by value</option>
          <option value="get_at">Get at index</option><option value="filter_contains">Filter (contains)</option>
          <option value="sort">Sort</option><option value="unique">Remove duplicates</option>
          <option value="reverse">Reverse</option><option value="length">Length (count)</option>
          <option value="join">Join to string</option><option value="slice">Slice</option>
          <option value="contains">Contains (boolean)</option><option value="index_of">Index of value</option>
          <option value="merge">Merge two lists</option>
        </select>
      </Field>
      <Field label="List Variable"><VarSelect value={d.listVar||''} onChange={v=>patch({listVar:v})} vars={vars} placeholder="myList" /></Field>
      {needsValue && <Field label={op==='merge'?'Second List Variable':'Value'} hint="supports {{var}}">
        <VarSelect value={d.value||''} onChange={v=>patch({value:v})} vars={vars} placeholder={op==='merge'?'list2':'item'} />
      </Field>}
      {needsIndex && <Field label="Index" hint="0-based"><input type="number" className={inp} value={d.index??0} min={0} onChange={e=>patch({index:Number(e.target.value)})} /></Field>}
      {needsJoin && <Field label="Separator"><input className={inp} value={d.separator??','} onChange={e=>patch({separator:e.target.value})} placeholder="," /></Field>}
      {needsSort && <Field label="Sort Direction">
        <select className={sel} value={d.sortDir||'asc'} onChange={e=>patch({sortDir:e.target.value as 'asc'|'desc'})}>
          <option value="asc">Ascending</option><option value="desc">Descending</option>
        </select>
      </Field>}
      {needsSlice && <div className="flex gap-2 mb-3">
        <div className="flex-1"><label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Start</label>
          <input type="number" className={inp} value={d.sliceStart??0} onChange={e=>patch({sliceStart:Number(e.target.value)})} /></div>
        <div className="flex-1"><label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">End (−1 = all)</label>
          <input type="number" className={inp} value={d.sliceEnd??-1} onChange={e=>patch({sliceEnd:Number(e.target.value)})} /></div>
      </div>}
      {producesVar && <Field label="Save Result As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="list" /></Field>}
    </>
  );
}

function DateTimeConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as DateTimeData;
  function patch(p: Partial<DateTimeData>) { onChange(node.id, { ...node.data, ...p }); }
  const op = d.operation || 'now';
  const needsInput  = !['now','unix_now'].includes(op);
  const needsInput2 = op === 'diff';
  const needsAmount = ['add','subtract'].includes(op);
  const needsFmt    = ['format','parse','now','unix_now'].includes(op);
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <select className={sel} value={op} onChange={e=>patch({operation:e.target.value as DateTimeData['operation']})}>
          <option value="now">Now (formatted)</option><option value="unix_now">Unix Timestamp (now)</option>
          <option value="format">Format date string</option><option value="parse">Parse ▶ standard format</option>
          <option value="add">Add duration</option><option value="subtract">Subtract duration</option>
          <option value="diff">Difference between two dates</option>
          <option value="to_unix">Date ▶ Unix timestamp</option><option value="from_unix">Unix ▶ formatted date</option>
        </select>
      </Field>
      {needsInput && <Field label="Input Date / Var" hint="supports {{var}}">
        <VarSelect value={d.input||''} onChange={v=>patch({input:v})} vars={vars} placeholder="{{date}} or 2024-01-01" />
      </Field>}
      {needsInput2 && <Field label="End Date / Var" hint="supports {{var}}">
        <VarSelect value={d.input2||''} onChange={v=>patch({input2:v})} vars={vars} placeholder="{{endDate}}" />
      </Field>}
      {op==='parse' && <Field label="Input Format"><input className={inp} value={d.parseFormat||''} onChange={e=>patch({parseFormat:e.target.value})} placeholder="YYYY-MM-DD" /></Field>}
      {needsFmt && <Field label="Output Format"><input className={inp} value={d.format||'YYYY-MM-DD HH:mm:ss'} onChange={e=>patch({format:e.target.value})} placeholder="YYYY-MM-DD HH:mm:ss" /></Field>}
      {needsAmount && <div className="flex gap-2 mb-3">
        <div className="flex-1"><label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Amount</label>
          <input type="number" className={inp} value={d.amount??1} onChange={e=>patch({amount:Number(e.target.value)})} /></div>
        <div className="flex-1"><label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Unit</label>
          <select className={sel} value={d.unit||'h'} onChange={e=>patch({unit:e.target.value as DateTimeData['unit']})}>
            <option value="ms">ms</option><option value="s">seconds</option><option value="m">minutes</option>
            <option value="h">hours</option><option value="d">days</option><option value="w">weeks</option>
            <option value="month">months</option><option value="year">years</option>
          </select>
        </div>
      </div>}
      <Field label="Timezone"><input className={inp} value={d.timezone||'UTC'} onChange={e=>patch({timezone:e.target.value})} placeholder="UTC or America/New_York" /></Field>
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="date" />
    </>
  );
}

function MathOpConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as MathOpData;
  function patch(p: Partial<MathOpData>) { onChange(node.id, { ...node.data, ...p }); }
  const op = d.operation || 'add';
  const unary  = ['sqrt','abs','round','floor','ceil','log','log2','log10','to_int','to_float'].includes(op);
  const clamp  = op === 'clamp';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Operation">
        <select className={sel} value={op} onChange={e=>patch({operation:e.target.value as MathOpData['operation']})}>
          <optgroup label="Arithmetic">
            <option value="add">Add (+)</option><option value="sub">Subtract (−)</option>
            <option value="mul">Multiply (×)</option><option value="div">Divide (÷)</option>
            <option value="mod">Modulo (%)</option><option value="pow">Power (^)</option>
          </optgroup>
          <optgroup label="Rounding">
            <option value="round">Round</option><option value="floor">Floor ⌊⌋</option><option value="ceil">Ceil ⌈⌉</option>
          </optgroup>
          <optgroup label="Functions">
            <option value="sqrt">Square Root √</option><option value="abs">Absolute Value |x|</option>
            <option value="min">Minimum</option><option value="max">Maximum</option><option value="clamp">Clamp</option>
            <option value="log">Natural Log ln</option><option value="log2">Log base 2</option><option value="log10">Log base 10</option>
          </optgroup>
          <optgroup label="Convert">
            <option value="to_int">To Integer</option><option value="to_float">To Float</option>
          </optgroup>
        </select>
      </Field>
      <Field label={clamp?'Value':unary?'Input (a)':'Left (a)'} hint="supports {{var}}">
        <VarSelect value={d.a||''} onChange={v=>patch({a:v})} vars={vars} placeholder="{{num}} or 42" />
      </Field>
      {!unary && !clamp && <Field label="Right (b)" hint="supports {{var}}">
        <VarSelect value={d.b||''} onChange={v=>patch({b:v})} vars={vars} placeholder="{{num}} or 10" />
      </Field>}
      {clamp && <>
        <Field label="Min (b)"><VarSelect value={d.b||''} onChange={v=>patch({b:v})} vars={vars} placeholder="0" /></Field>
        <Field label="Max (c)"><VarSelect value={d.c||''} onChange={v=>patch({c:v})} vars={vars} placeholder="100" /></Field>
      </>}
      {['round','to_float'].includes(op) && <Field label="Decimal Places">
        <input type="number" className={inp} value={d.precision??0} min={0} max={15} onChange={e=>patch({precision:Number(e.target.value)})} />
      </Field>}
      <SaveAsField varName={d.varName||''} encodeOutput={!!d.encodeOutput} onVarName={v=>patch({varName:v})} capture={d.capture !== false} onCapture={v=>patch({capture:v})} onEncode={v=>patch({encodeOutput:v})} placeholder="result" />
    </>
  );
}

function TryCatchConfig({ node, onChange }: { node: Node; onChange: Props['onChange'] }) {
  const d = node.data as TryCatchData;
  function patch(p: Partial<TryCatchData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <p className="text-[10px] text-gray-600 leading-relaxed px-0.5">
        Connect <span className="text-emerald-500">try</span> to the node that may fail.
        Connect <span className="text-red-400">catch</span> to your error-handling path.
        Any unhandled error downstream of <span className="text-emerald-500">try</span> routes here.
      </p>
    </>
  );
}

function WebhookConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as WebhookData;
  function patch(p: Partial<WebhookData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Method">
        <select className={sel} value={d.method||'POST'} onChange={e=>patch({method:e.target.value as WebhookData['method']})}>
          <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
        </select>
      </Field>
      <Field label="URL" hint="supports {{var}}"><VarSelect value={d.url||''} onChange={v=>patch({url:v})} vars={vars} placeholder="https://discord.com/api/webhooks/..." /></Field>
      <Field label="Headers" hint="one per line: Name: Value">
        <textarea className={`${ta} font-mono`} rows={3} spellCheck={false}
          value={d.headers||''} onChange={e=>patch({headers:e.target.value})}
          placeholder={"Content-Type: application/json\nAuthorization: Bearer token"} />
      </Field>
      <Field label="Body" hint="supports {{var}}">
        <textarea className={`${ta} font-mono`} rows={4} value={d.body||''} onChange={e=>patch({body:e.target.value})}
          placeholder={'{"content": "{{message}}"}'} />
        <VarAppender vars={vars} current={d.body||''} onChange={v=>patch({body:v})} />
      </Field>
      <Field label="Save Response As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="webhookResp" /></Field>
    </>
  );
}

function CaptchaConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as CaptchaSolverData;
  function patch(p: Partial<CaptchaSolverData>) { onChange(node.id, { ...node.data, ...p }); }
  const isImage    = d.captchaType === 'image';
  const needsSite  = !isImage;
  const isV3       = d.captchaType === 'recaptcha_v3';
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Provider">
        <select className={sel} value={d.provider||'2captcha'} onChange={e=>patch({provider:e.target.value as CaptchaSolverData['provider']})}>
          <option value="2captcha">2captcha</option><option value="anticaptcha">Anti-Captcha</option>
          <option value="capmonster">CapMonster</option><option value="deathbycaptcha">DeathByCaptcha</option>
          <option value="nopecha">NopeCHA</option>
        </select>
      </Field>
      <Field label="API Key" hint="supports {{var}}"><VarSelect value={d.apiKey||''} onChange={v=>patch({apiKey:v})} vars={vars} placeholder="API key" /></Field>
      <Field label="Captcha Type">
        <select className={sel} value={d.captchaType||'recaptcha_v2'} onChange={e=>patch({captchaType:e.target.value as CaptchaSolverData['captchaType']})}>
          <option value="recaptcha_v2">reCAPTCHA v2</option><option value="recaptcha_v3">reCAPTCHA v3</option>
          <option value="hcaptcha">hCaptcha</option><option value="turnstile">Cloudflare Turnstile</option>
          <option value="funcaptcha">FunCaptcha</option><option value="geetest">GeeTest</option>
          <option value="image">Image CAPTCHA</option>
        </select>
      </Field>
      {isImage && <Field label="Image Variable"><VarSelect value={d.imageVar||''} onChange={v=>patch({imageVar:v})} vars={vars} placeholder="base64Image" /></Field>}
      {needsSite && <>
        <Field label="Site Key" hint="from the target page"><VarSelect value={d.siteKey||''} onChange={v=>patch({siteKey:v})} vars={vars} placeholder="6Le-..." /></Field>
        <Field label="Page URL" hint="supports {{var}}"><VarSelect value={d.pageUrl||''} onChange={v=>patch({pageUrl:v})} vars={vars} placeholder="https://example.com/login" /></Field>
      </>}
      {isV3 && <Field label="Min Score" hint="0.1 – 0.9">
        <input type="number" className={inp} value={d.minScore??0.7} min={0.1} max={0.9} step={0.1} onChange={e=>patch({minScore:Number(e.target.value)})} />
      </Field>}
      <Field label="Save Token As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="captchaToken" /></Field>
    </>
  );
}

function JsExecuteConfig({ node, onChange, vars }: { node: Node; onChange: Props['onChange']; vars: VarGroup[] }) {
  const d = node.data as JsExecuteData;
  function patch(p: Partial<JsExecuteData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Code" hint='return value becomes the output variable'>
        <textarea className={`${inp} h-32 resize-none font-mono text-[11px] leading-relaxed`}
          value={d.code||''} onChange={e=>patch({code:e.target.value})}
          placeholder={'// variables are injected as globals\nreturn input.trim();'} />
      </Field>
      <Field label="Variable Bindings" hint='{"jsVar": "flowVar"} — maps flow vars to JS globals'>
        <textarea className={`${inp} h-16 resize-none font-mono text-[11px]`}
          value={d.inputs||'{}'} onChange={e=>patch({inputs:e.target.value})}
          placeholder={'{"input": "myVar"}'} />
      </Field>
      <Field label="Save Return Value As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="jsResult" /></Field>
    </>
  );
}

function TerminalConfig({ node, onChange }: { node: Node; onChange: Props['onChange'] }) {
  const d = node.data as TerminalData;
  function patch(p: Partial<TerminalData>) { onChange(node.id, { ...node.data, ...p }); }
  return (
    <>
      <Field label="Label"><input className={inp} value={d.label||''} onChange={e=>patch({label:e.target.value})} /></Field>
      <Field label="Command" hint='Supports {{variable}} interpolation. Runs via cmd /C on Windows, sh -c on Unix.'>
        <textarea className={`${inp} h-24 resize-none font-mono text-[11px] leading-relaxed`}
          value={d.command||''} onChange={e=>patch({command:e.target.value})}
          placeholder={'echo {{User}}'} />
      </Field>
      <Field label="Timeout (ms)" hint='0 = inherit flow timeout'>
        <input type="number" min={0} step={1000} className={inp} value={d.timeout||0}
          onChange={e=>patch({timeout:Number(e.target.value)})} />
      </Field>
      <EncodingSelect value={(d.outputEncoding || 'utf8') as TextEncoding} onChange={v => patch({ outputEncoding: v })} />
      <Field label="Save Output As"><input className={`${inp} font-mono`} value={d.varName||''} onChange={e=>patch({varName:e.target.value})} placeholder="cmdOut" /></Field>
    </>
  );
}
