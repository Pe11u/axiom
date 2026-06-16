import { useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps, useReactFlow, useUpdateNodeInternals } from '@xyflow/react';


export interface RequestNodeData extends Record<string, unknown> {
  label: string; method: string; url: string;
  tlsProfile: string; httpVersion: '1.1' | '2';
  userAgent: string; headers: string; cookies: string; body: string;
  timeout: number; followRedirects: boolean;
  requestType: 'standard' | 'basicauth' | 'multipart' | 'raw';
  contentType: string;
  responseType: 'string' | 'base64';
  acceptEncoding: boolean; encodeContent: boolean; readResponseBody: boolean;
  basicAuthUser: string; basicAuthPass: string;
}


export interface ParseNodeData extends Record<string, unknown> {
  label: string;
  input: string;
  parseType: 'between' | 'json';
  startStr: string; endStr: string;
  occurrence: 'first' | 'last' | 'all';
  jsonKey: string; varName: string;
}

export interface RegexExtractData extends Record<string, unknown> {
  label: string;
  input: string;
  pattern: string; group: number;
  multiline: boolean; caseInsensitive: boolean; allMatches: boolean;
  varName: string;
}

export interface HtmlSelectData extends Record<string, unknown> {
  label: string;
  input: string;
  selector: string;
  attribute: string;
  index: number; varName: string;
}

export interface XPathSelectData extends Record<string, unknown> {
  label: string;
  input: string;
  xpath: string; index: number; varName: string;
}

export interface JsonExtractData extends Record<string, unknown> {
  label: string;
  input: string;
  path: string;
  allMatches: boolean;
  varName: string;
}


export interface SetVariableData extends Record<string, unknown> {
  label: string; varName: string; value: string;
}

export interface RandomDataData extends Record<string, unknown> {
  label: string;
  dataType: 'string' | 'integer' | 'float' | 'email' | 'credit_card' | 'username' | 'password'
          | 'uuid' | 'ip' | 'ipv6' | 'mac_address' | 'name' | 'phone' | 'hex_color' | 'domain' | 'user_agent';
  length: number; min: number; max: number; charset: string; customCharset?: string;
  domain?: string; cardType?: string; varName: string;
}

export interface ListItemData extends Record<string, unknown> {
  label: string; listVar: string;
  pickMode: 'first' | 'last' | 'random' | 'index';
  index: number; varName: string;
}

export interface StringOpData extends Record<string, unknown> {
  label: string;
  operation: 'upper' | 'lower' | 'trim' | 'trim_start' | 'trim_end' | 'replace' | 'remove'
           | 'regex_replace' | 'split' | 'join' | 'substring' | 'length' | 'count' | 'reverse'
           | 'repeat' | 'pad_left' | 'pad_right' | 'starts_with' | 'ends_with' | 'contains'
           | 'index_of' | 'extract_between';
  input: string; param1: string; param2: string; varName: string;
}

export interface EncodeDecodeData extends Record<string, unknown> {
  label: string;
  operation: 'base64_enc' | 'base64_dec' | 'base64_url_enc' | 'base64_url_dec'
           | 'url_enc' | 'url_dec' | 'html_enc' | 'html_dec'
           | 'hex_enc' | 'hex_dec' | 'json_stringify' | 'json_parse' | 'jwt_decode';
  input: string; varName: string;
}

export interface HashData extends Record<string, unknown> {
  label: string;
  algorithm: 'md5' | 'sha1' | 'sha256' | 'sha512'
           | 'hmac_md5' | 'hmac_sha1' | 'hmac_sha256' | 'hmac_sha512';
  input: string; key: string; uppercase: boolean;
  outputEncoding: 'hex' | 'base64';
  varName: string;
}

export interface CryptoAesData extends Record<string, unknown> {
  label: string;
  operation: 'encrypt' | 'decrypt';
  mode: 'ECB' | 'CBC' | 'GCM';
  keySize: 128 | 256;
  input: string; key: string; iv: string;
  keyEncoding: 'utf8' | 'hex' | 'base64';
  inputEncoding: 'utf8' | 'hex' | 'base64';
  outputEncoding: 'base64' | 'hex';
  varName: string;
}


export type ConditionOp = 'eq' | 'neq' | 'contains' | 'not_contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'regex' | 'is_empty' | 'not_empty';
export type ConditionField = 'status_code' | 'body' | 'response_header' | 'variable';

export type ConditionRule = {
  field: ConditionField;
  fieldName: string;
  op: ConditionOp;
  value: string;
};

export type ConditionBranch = {
  id: string;
  label: string;
  color: string;
  logic: 'and' | 'or';
  rules: ConditionRule[];
};

export interface ConditionNodeData extends Record<string, unknown> {
  label: string;
  branches: ConditionBranch[];
}

export interface LoopData extends Record<string, unknown> {
  label: string;
  loopMode: 'count' | 'list';
  times: number; indexVar: string;
  listVar: string; itemVar: string;
}

export interface WaitData extends Record<string, unknown> {
  label: string; ms: number; jitter: number;
}


export interface CommentNodeData extends Record<string, unknown> {
  text: string; w: number; h: number;
}

export interface WebSocketNodeData extends Record<string, unknown> {
  label: string;
  url: string;
  protocol: string;
  headers: string;
  sendMessage: string;
  waitForMessage: boolean;
  timeout: number;
  varName: string;
}

export interface DnsLookupData extends Record<string, unknown> {
  label: string;
  domain: string;
  recordType: 'A' | 'AAAA' | 'MX' | 'TXT' | 'CNAME' | 'NS' | 'SOA' | 'PTR';
  server: string;
  varName: string;
}

export interface SmtpSendData extends Record<string, unknown> {
  label: string;
  host: string;
  port: number;
  secureMode: 'ssl' | 'starttls' | 'none';
  username: string;
  password: string;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  replyTo: string;
  subject: string;
  body: string;
  isHtml: boolean;
}

export interface ImapFetchData extends Record<string, unknown> {
  label: string;
  host: string;
  port: number;
  secureMode: 'ssl' | 'starttls' | 'none';
  username: string;
  password: string;
  folder: string;
  searchField: 'unseen' | 'all' | 'subject' | 'from' | 'body';
  searchValue: string;
  fetchField: 'text' | 'html' | 'subject' | 'from' | 'date';
  index: number;
  markAsRead: boolean;
  varName: string;
}

export interface TcpConnectData extends Record<string, unknown> {
  label: string; host: string; port: number;
  sendData: string; encoding: 'utf8' | 'hex' | 'base64';
  timeout: number; varName: string;
}

export interface SshExecuteData extends Record<string, unknown> {
  label: string; host: string; port: number; username: string;
  authMode: 'password' | 'key'; password: string; privateKey: string;
  command: string; outputEncoding: TextEncoding; varName: string;
}

export interface FtpSftpData extends Record<string, unknown> {
  label: string; host: string; port: number;
  protocol: 'ftp' | 'sftp' | 'ftps';
  username: string; password: string;
  operation: 'upload' | 'download' | 'list' | 'delete' | 'mkdir' | 'rename';
  remotePath: string; localPath: string; varName: string;
}

export interface FileReadData extends Record<string, unknown> {
  label: string; path: string;
  mode: 'full' | 'lines' | 'line_at' | 'random_line';
  index: number; encoding: TextEncoding; varName: string;
}

export interface FileWriteData extends Record<string, unknown> {
  label: string; path: string; content: string;
  mode: 'write' | 'append' | 'prepend';
  encoding: TextEncoding; newline: boolean;
}

export interface JsonBuildData extends Record<string, unknown> {
  label: string; fields: string; varName: string;
}

export interface ListOpData extends Record<string, unknown> {
  label: string;
  operation: 'create' | 'append' | 'prepend' | 'remove_at' | 'remove_value'
           | 'get_at' | 'filter_contains' | 'sort' | 'unique' | 'reverse'
           | 'length' | 'join' | 'slice' | 'contains' | 'index_of' | 'merge';
  listVar: string; value: string; index: number;
  separator: string; sortDir: 'asc' | 'desc';
  sliceStart: number; sliceEnd: number; varName: string;
}

export interface DateTimeData extends Record<string, unknown> {
  label: string;
  operation: 'now' | 'format' | 'parse' | 'add' | 'subtract' | 'diff'
           | 'unix_now' | 'from_unix' | 'to_unix';
  input: string; input2: string;
  format: string; parseFormat: string;
  amount: number; unit: 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'month' | 'year';
  timezone: string; varName: string;
}

export interface MathOpData extends Record<string, unknown> {
  label: string;
  operation: 'add' | 'sub' | 'mul' | 'div' | 'mod' | 'pow' | 'sqrt'
           | 'abs' | 'round' | 'floor' | 'ceil' | 'min' | 'max' | 'clamp'
           | 'log' | 'log2' | 'log10' | 'to_int' | 'to_float';
  a: string; b: string; c: string; precision: number; varName: string;
}

export interface TryCatchData extends Record<string, unknown> {
  label: string;
}

export interface WebhookData extends Record<string, unknown> {
  label: string; url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: string; body: string; varName: string;
}

export interface CaptchaSolverData extends Record<string, unknown> {
  label: string;
  provider: '2captcha' | 'anticaptcha' | 'capmonster' | 'deathbycaptcha' | 'nopecha';
  apiKey: string;
  captchaType: 'image' | 'recaptcha_v2' | 'recaptcha_v3' | 'hcaptcha' | 'funcaptcha' | 'turnstile' | 'geetest';
  imageVar: string; siteKey: string; pageUrl: string;
  minScore: number; varName: string;
}

export type TextEncoding =
  | 'utf8' | 'utf16le' | 'utf16be'
  | 'shiftjis' | 'eucjp' | 'gbk'
  | 'latin1' | 'cp1252';

export const TEXT_ENCODINGS: { value: TextEncoding; label: string }[] = [
  { value: 'utf8',    label: 'UTF-8' },
  { value: 'utf16le', label: 'UTF-16 LE' },
  { value: 'utf16be', label: 'UTF-16 BE' },
  { value: 'shiftjis',label: 'Shift-JIS (CP932)' },
  { value: 'eucjp',   label: 'EUC-JP' },
  { value: 'gbk',     label: 'GBK / GB2312' },
  { value: 'latin1',  label: 'Latin-1 (ISO-8859-1)' },
  { value: 'cp1252',  label: 'CP1252 (Windows-1252)' },
];

export interface TerminalData extends Record<string, unknown> {
  label: string;
  command: string;
  varName: string;
  timeout: number;
  outputEncoding: TextEncoding;
}

export interface JsExecuteData extends Record<string, unknown> {
  label: string; code: string;
  inputs: string;
  varName: string;
}


export const CUSTOM_COLORS: { name: string; hex: string }[] = [
  { name: 'Teal',   hex: '#14b8a6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Sky',    hex: '#0ea5e9' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Pink',   hex: '#ec4899' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rose',   hex: '#f43f5e' },
  { name: 'Lime',   hex: '#84cc16' },
];


export const DEFAULT_NODE_DATA: Record<string, unknown> = {
  http_request: {
    label: 'HTTP Request', method: 'GET', url: '',
    tlsProfile: 'chrome_146', httpVersion: '1.1',
    body: '', cookies: '',
    requestType: 'standard', contentType: 'application/x-www-form-urlencoded',
    responseType: 'string',
    acceptEncoding: true, encodeContent: false, readResponseBody: true,
    followRedirects: true, timeout: 30000,
    basicAuthUser: '', basicAuthPass: '',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36',
    headers: 'Pragma: no-cache\nAccept: */*\nAccept-Language: en-US,en;q=0.8',
  },
  parse:         { label: 'Parse', input: '', parseType: 'between', startStr: '', endStr: '', occurrence: 'first', jsonKey: '', varName: 'value' },
  regex_extract: { label: 'Regex Extract', input: '', pattern: '', group: 0, multiline: false, caseInsensitive: false, allMatches: false, varName: 'match' },
  html_select:   { label: 'HTML Select', input: '', selector: '', attribute: 'text', index: 0, varName: 'element' },
  xpath_select:  { label: 'XPath Select', input: '', xpath: '', index: 0, varName: 'node' },
  json_extract:  { label: 'JSON Extract', input: '', path: '', allMatches: false, varName: 'extracted' },
  set_variable:  { label: 'Set Variable', varName: 'myVar', value: '' },
  random_data:   { label: 'Random', dataType: 'string', length: 8, min: 0, max: 100, charset: 'alphanum', varName: 'rand' },
  list_item:     { label: 'List Item', listVar: 'list', pickMode: 'random', index: 0, varName: 'item' },
  string_op:     { label: 'String Op', operation: 'replace', input: '', param1: '', param2: '', varName: 'result' },
  encode_decode: { label: 'Encode/Decode', operation: 'base64_enc', input: '', varName: 'result' },
  hash:          { label: 'Hash', algorithm: 'sha256', input: '', key: '', uppercase: false, outputEncoding: 'hex', varName: 'hash' },
  crypto_aes:    { label: 'AES Crypto', operation: 'encrypt', mode: 'CBC', keySize: 128, input: '', key: '', iv: '', keyEncoding: 'utf8', inputEncoding: 'utf8', outputEncoding: 'base64', varName: 'result' },
  output:        { label: 'Output', branches: [
    { id: 'success', label: 'SUCCESS', color: '#22c55e', logic: 'and', rules: [{ field: 'status_code', fieldName: '', op: 'eq', value: '200' }] },
    { id: 'fail',    label: 'FAIL',    color: '#ef4444', logic: 'or',  rules: [{ field: 'status_code', fieldName: '', op: 'neq', value: '200' }] },
  ]},
  if:            { label: 'If', branches: [
    { id: 'true',  label: 'TRUE',  color: '#22c55e', logic: 'and', rules: [] },
    { id: 'false', label: 'FALSE', color: '#6b7280', logic: 'and', rules: [] },
  ]},
  loop:          { label: 'Loop', loopMode: 'count', times: 10, indexVar: 'i', listVar: '', itemVar: 'item' },
  wait:          { label: 'Wait', ms: 1000, jitter: 0 },
  comment:       { text: '', w: 200, h: 120 },
  websocket:     { label: 'WebSocket', url: '', protocol: '', headers: '', sendMessage: '', waitForMessage: true, timeout: 10000, varName: 'wsMsg' },
  dns_lookup:    { label: 'DNS Lookup', domain: '', recordType: 'A', server: '', varName: 'dnsResult' },
  smtp_send:     { label: 'SMTP Send', host: '', port: 587, secureMode: 'starttls', username: '', password: '', from: '', to: '', cc: '', bcc: '', replyTo: '', subject: '', body: '', isHtml: false },
  imap_fetch:    { label: 'IMAP Fetch', host: '', port: 993, secureMode: 'ssl', username: '', password: '', folder: 'INBOX', searchField: 'unseen', searchValue: '', fetchField: 'text', index: 0, markAsRead: false, varName: 'email' },
  tcp_connect:   { label: 'TCP Connect', host: '', port: 80, sendData: '', encoding: 'utf8', timeout: 5000, varName: 'tcpResp' },
  ssh_execute:   { label: 'SSH Execute', host: '', port: 22, username: 'root', authMode: 'password', password: '', privateKey: '', command: '', outputEncoding: 'utf8', varName: 'sshOut' },
  ftp_sftp:      { label: 'FTP / SFTP', host: '', port: 21, protocol: 'ftp', username: '', password: '', operation: 'list', remotePath: '/', localPath: '', varName: 'ftpResult' },
  file_read:     { label: 'File Read', path: '', mode: 'lines', index: 0, encoding: 'utf8', varName: 'fileData' },
  file_write:    { label: 'File Write', path: '', content: '', mode: 'append', encoding: 'utf8', newline: true },
  json_build:    { label: 'JSON Build', fields: JSON.stringify([{ key: '', value: '' }]), varName: 'json' },
  list_op:       { label: 'List Op', operation: 'append', listVar: '', value: '', index: 0, separator: ',', sortDir: 'asc', sliceStart: 0, sliceEnd: -1, varName: 'list' },
  date_time:     { label: 'Date / Time', operation: 'now', input: '', input2: '', format: 'YYYY-MM-DD HH:mm:ss', parseFormat: 'YYYY-MM-DD', amount: 1, unit: 'h', timezone: 'UTC', varName: 'date' },
  math_op:       { label: 'Math', operation: 'add', a: '', b: '', c: '', precision: 0, varName: 'result' },
  try_catch:     { label: 'Try / Catch' },
  webhook:       { label: 'Webhook', url: '', method: 'POST', headers: '', body: '', varName: 'webhookResp' },
  captcha_solver:{ label: 'Captcha Solver', provider: '2captcha', apiKey: '', captchaType: 'recaptcha_v2', imageVar: '', siteKey: '', pageUrl: '', minScore: 0.7, varName: 'captchaToken' },
  js_execute:    { label: 'JS Execute', code: 'return input;', inputs: '{}', varName: 'jsResult' },
  terminal:      { label: 'Terminal', command: '', varName: 'cmdOut', timeout: 0, outputEncoding: 'utf8' },
};


function NodeShell({
  border, titleColor, title, selected, children,
  hasInput = true, hasOutput = true, outputHandles, dot, dotColor, style,
}: {
  border: string; titleColor: string; title: string; selected: boolean | undefined;
  children?: React.ReactNode; hasInput?: boolean; hasOutput?: boolean;
  outputHandles?: React.ReactNode; dot?: string; dotColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`relative bg-[#1e2130] rounded-lg p-3 w-[200px] text-xs shadow-lg
      border ${border} ${selected ? 'ring-2 ring-white/30' : ''}`} style={style}>
      {hasInput && <Handle type="target" position={Position.Top} className="!bg-gray-500" />}
      <div className="flex items-center gap-1.5 mb-1.5">
        {dot    ? <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} /> : null}
        {dotColor && !dot ? <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} /> : null}
        <span className="font-semibold truncate" style={{ color: titleColor }}>{title}</span>
      </div>
      {children && <div className="text-gray-500 space-y-0.5 text-[10px]">{children}</div>}
      {outputHandles ?? (hasOutput && <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />)}
    </div>
  );
}


export function RequestNode({ data, selected }: NodeProps) {
  const d = data as RequestNodeData;
  return (
    <NodeShell border="border-indigo-500/60" dot="bg-indigo-400" titleColor="#a5b4fc"
      title={d.label || 'HTTP Request'} selected={selected}>
      <div><span className="text-gray-700">method </span>{d.method || 'GET'}</div>
      {d.url
        ? <div className="truncate font-mono"><span className="text-gray-700">url </span>{d.url}</div>
        : <div className="text-gray-700 italic">no URL set</div>}
      <div><span className="text-gray-700">tls </span>{d.tlsProfile || 'chrome_146'}</div>
    </NodeShell>
  );
}


export function ParseNode({ data, selected }: NodeProps) {
  const d = data as ParseNodeData;
  return (
    <NodeShell border="border-purple-500/60" dot="bg-purple-400" titleColor="#d8b4fe"
      title={d.label || 'Parse'} selected={selected}>
      {d.parseType === 'json'
        ? <div className="font-mono"><span className="text-gray-700">json: </span>{d.jsonKey || <span className="italic">no key</span>}</div>
        : (d.startStr || d.endStr)
          ? <>
              <div className="truncate font-mono"><span className="text-gray-700">from </span>"{d.startStr}"</div>
              <div className="truncate font-mono"><span className="text-gray-700">to </span>"{d.endStr}"</div>
            </>
          : <div className="text-gray-700 italic">not configured</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function RegexExtractNode({ data, selected }: NodeProps) {
  const d = data as RegexExtractData;
  return (
    <NodeShell border="border-purple-500/60" dot="bg-purple-400" titleColor="#d8b4fe"
      title={d.label || 'Regex'} selected={selected}>
      {d.pattern
        ? <div className="truncate font-mono">/{d.pattern}/</div>
        : <div className="italic text-gray-700">no pattern</div>}
      {d.group > 0 && <div><span className="text-gray-700">group </span>{d.group}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function HtmlSelectNode({ data, selected }: NodeProps) {
  const d = data as HtmlSelectData;
  return (
    <NodeShell border="border-purple-500/60" dot="bg-purple-400" titleColor="#d8b4fe"
      title={d.label || 'HTML Select'} selected={selected}>
      {d.selector
        ? <div className="truncate font-mono">{d.selector}</div>
        : <div className="italic text-gray-700">no selector</div>}
      <div><span className="text-gray-700">attr </span>{d.attribute || 'text'}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function XPathSelectNode({ data, selected }: NodeProps) {
  const d = data as XPathSelectData;
  return (
    <NodeShell border="border-purple-500/60" dot="bg-purple-400" titleColor="#d8b4fe"
      title={d.label || 'XPath'} selected={selected}>
      {d.xpath
        ? <div className="truncate font-mono">{d.xpath}</div>
        : <div className="italic text-gray-700">no xpath</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function JsonExtractNode({ data, selected }: NodeProps) {
  const d = data as JsonExtractData;
  return (
    <NodeShell border="border-purple-500/60" dot="bg-purple-400" titleColor="#d8b4fe"
      title={d.label || 'JSON Extract'} selected={selected}>
      {d.path
        ? <div className="truncate font-mono">{d.path}</div>
        : <div className="italic text-gray-700">no path</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}


export function SetVariableNode({ data, selected }: NodeProps) {
  const d = data as SetVariableData;
  return (
    <NodeShell border="border-sky-500/60" dot="bg-sky-400" titleColor="#7dd3fc"
      title={d.label || 'Set Variable'} selected={selected}>
      <div className="font-mono truncate">
        <span className="text-sky-700">{d.varName || '?'}</span>
        <span className="text-gray-700"> = </span>
        <span>{d.value || '…'}</span>
      </div>
    </NodeShell>
  );
}

export function RandomDataNode({ data, selected }: NodeProps) {
  const d = data as RandomDataData;
  return (
    <NodeShell border="border-sky-500/60" dot="bg-sky-400" titleColor="#7dd3fc"
      title={d.label || 'Random'} selected={selected}>
      <div><span className="text-gray-700">type </span>{d.dataType || 'string'}</div>
      {(d.dataType === 'string') && <div><span className="text-gray-700">len </span>{d.length}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function ListItemNode({ data, selected }: NodeProps) {
  const d = data as ListItemData;
  return (
    <NodeShell border="border-sky-500/60" dot="bg-sky-400" titleColor="#7dd3fc"
      title={d.label || 'List Item'} selected={selected}>
      <div className="font-mono"><span className="text-gray-700">from </span>{d.listVar || '?'}</div>
      <div><span className="text-gray-700">pick </span>{d.pickMode}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function StringOpNode({ data, selected }: NodeProps) {
  const d = data as StringOpData;
  return (
    <NodeShell border="border-orange-500/60" dot="bg-orange-400" titleColor="#fdba74"
      title={d.label || 'String Op'} selected={selected}>
      <div><span className="text-gray-700">op </span>{d.operation}</div>
      {d.input && <div className="truncate font-mono">{d.input}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

const ENC_SHORT: Record<string, string> = {
  base64_enc: 'B64 encode', base64_dec: 'B64 decode',
  base64_url_enc: 'B64-URL encode', base64_url_dec: 'B64-URL decode',
  url_enc: 'URL encode', url_dec: 'URL decode',
  html_enc: 'HTML encode', html_dec: 'HTML decode',
  hex_enc: 'HEX encode', hex_dec: 'HEX decode',
  json_stringify: 'JSON stringify', json_parse: 'JSON parse',
  jwt_decode: 'JWT decode',
};

export function EncodeDecodeNode({ data, selected }: NodeProps) {
  const d = data as EncodeDecodeData;
  return (
    <NodeShell border="border-orange-500/60" dot="bg-orange-400" titleColor="#fdba74"
      title={d.label || 'Encode/Decode'} selected={selected}>
      <div>{ENC_SHORT[d.operation] || d.operation}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function HashNode({ data, selected }: NodeProps) {
  const d = data as HashData;
  return (
    <NodeShell border="border-orange-500/60" dot="bg-orange-400" titleColor="#fdba74"
      title={d.label || 'Hash'} selected={selected}>
      <div className="font-mono uppercase">{d.algorithm}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function CryptoAesNode({ data, selected }: NodeProps) {
  const d = data as CryptoAesData;
  return (
    <NodeShell border="border-orange-500/60" dot="bg-orange-400" titleColor="#fdba74"
      title={d.label || 'AES Crypto'} selected={selected}>
      <div><span className="text-gray-700">AES-{d.keySize} </span>{d.mode} {d.operation}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}


function branchHandles(id: string, branches: ConditionBranch[], titleFallback: string, data: ConditionNodeData, selected: boolean | undefined, border: string, dot: string, titleColor: string, flexGap = 10, spreadPx?: number) {
  const ruleCount = branches.reduce((n, b) => n + b.rules.length, 0);
  const CHAR_PX = 7, HANDLE_W = 25, HPAD = 26;
  const branchesW = branches.reduce((s, b) => s + Math.max(HANDLE_W, b.label.length * CHAR_PX), 0)
    + Math.max(0, branches.length - 1) * flexGap;
  const nodeW = Math.max(180, branchesW + HPAD);

  const spreadHandles = spreadPx != null && branches.length === 2 ? (
    <>
      <Handle type="source" position={Position.Bottom} id={branches[0].id}
        style={{ left: `calc(50% - ${spreadPx}px)`, background: branches[0].color }} />
      <Handle type="source" position={Position.Bottom} id={branches[1].id}
        style={{ left: `calc(50% + ${spreadPx}px)`, background: branches[1].color }} />
      <div className="relative mt-1 h-3">
        <span className="absolute text-[9px] select-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: `calc(50% - ${spreadPx}px)`, color: branches[0].color }}>{branches[0].label}</span>
        <span className="absolute text-[9px] select-none -translate-x-1/2 whitespace-nowrap"
          style={{ left: `calc(50% + ${spreadPx}px)`, color: branches[1].color }}>{branches[1].label}</span>
      </div>
    </>
  ) : null;

  return (
    <NodeShell
      border={border} dot={dot} titleColor={titleColor}
      title={data.label || titleFallback} selected={selected} hasOutput={false}
      style={{ width: nodeW, maxWidth: 'none' }}
      outputHandles={spreadHandles ?? (
        <>
          <div style={{ height: 14 }} />
          <div style={{
            position: 'absolute', bottom: -5.5, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: flexGap,
          }}>
            {branches.map(b => (
              <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span className="text-[9px] select-none whitespace-nowrap" style={{ color: b.color }}>
                  {b.label}
                </span>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={b.id}
                  style={{ position: 'relative', left: 'unset', bottom: 'unset', transform: 'none', background: b.color }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    >
      <div className="text-[10px] text-gray-400">
        {branches.length} branch{branches.length !== 1 ? 'es' : ''}
        {' · '}
        {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
      </div>
    </NodeShell>
  );
}

export function ConditionNode({ id, data, selected }: NodeProps) {
  const d = data as ConditionNodeData;
  const updateNodeInternals = useUpdateNodeInternals();
  const branches: ConditionBranch[] = Array.isArray(d.branches) && d.branches.length > 0
    ? d.branches
    : [{ id: 'success', label: 'SUCCESS', color: '#22c55e', logic: 'and', rules: [] },
       { id: 'fail',    label: 'FAIL',    color: '#ef4444', logic: 'and', rules: [] }];
  const branchKey = branches.map(b => b.label).join('|');
  useEffect(() => { updateNodeInternals(id); }, [id, branchKey, updateNodeInternals]);
  return branchHandles(id, branches, 'Condition', d, selected, 'border-amber-500/60', 'bg-amber-400', '#fcd34d');
}

export function IfNode({ id, data, selected }: NodeProps) {
  const d = data as ConditionNodeData;
  const updateNodeInternals = useUpdateNodeInternals();
  const branches: ConditionBranch[] = Array.isArray(d.branches) && d.branches.length > 0
    ? d.branches
    : [{ id: 'true',  label: 'TRUE',  color: '#22c55e', logic: 'and', rules: [] },
       { id: 'false', label: 'FALSE', color: '#6b7280', logic: 'and', rules: [] }];
  const branchKey = branches.map(b => b.label).join('|');
  useEffect(() => { updateNodeInternals(id); }, [id, branchKey, updateNodeInternals]);
  return branchHandles(id, branches, 'If', d, selected, 'border-sky-500/60', 'bg-sky-400', '#7dd3fc', 40, 40);
}


export function LoopNode({ data, selected }: NodeProps) {
  const d = data as LoopData;
  const isList = d.loopMode === 'list';
  return (
    <NodeShell
      border="border-amber-500/60" dot="bg-amber-400" titleColor="#fcd34d"
      title={d.label || 'Loop'} selected={selected} hasOutput={false}
      outputHandles={
        <>
          <Handle type="source" position={Position.Bottom} id="body"
            style={{ left: 'calc(50% - 20px)' }} className="!bg-emerald-500" />
          <Handle type="source" position={Position.Bottom} id="exit"
            style={{ left: 'calc(50% + 20px)' }} className="!bg-gray-500" />
          <div className="relative mt-1 h-3">
            <span className="absolute text-[9px] text-emerald-600 select-none -translate-x-1/2" style={{ left: 'calc(50% - 20px)' }}>body</span>
            <span className="absolute text-[9px] text-gray-600 select-none -translate-x-1/2"    style={{ left: 'calc(50% + 20px)' }}>exit</span>
          </div>
        </>
      }
    >
      {isList
        ? <div className="truncate"><span className="text-gray-700">each </span>{d.listVar || '?'}</div>
        : <div><span className="text-gray-700">× </span>{d.times}</div>}
      {d.indexVar && <div><span className="text-gray-700">i ▶ </span>{d.indexVar}</div>}
      {isList && d.itemVar && <div><span className="text-gray-700">item ▶ </span>{d.itemVar}</div>}
    </NodeShell>
  );
}

export function WaitNode({ data, selected }: NodeProps) {
  const d = data as WaitData;
  return (
    <NodeShell border="border-amber-500/60" dot="bg-amber-400" titleColor="#fcd34d"
      title={d.label || 'Wait'} selected={selected}>
      <div><span className="text-gray-700">delay </span>{d.ms}ms{d.jitter > 0 ? ` ±${d.jitter}` : ''}</div>
    </NodeShell>
  );
}


export function WebSocketNode({ data, selected }: NodeProps) {
  const d = data as WebSocketNodeData;
  return (
    <NodeShell border="border-cyan-500/60" dot="bg-cyan-400" titleColor="#67e8f9"
      title={d.label || 'WebSocket'} selected={selected}>
      {d.url
        ? <div className="truncate font-mono"><span className="text-gray-700">url </span>{d.url}</div>
        : <div className="text-gray-700 italic">no URL set</div>}
      {d.sendMessage && <div className="truncate"><span className="text-gray-700">send </span>{d.sendMessage}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function DnsLookupNode({ data, selected }: NodeProps) {
  const d = data as DnsLookupData;
  return (
    <NodeShell border="border-violet-500/60" dot="bg-violet-400" titleColor="#c4b5fd"
      title={d.label || 'DNS Lookup'} selected={selected}>
      {d.domain
        ? <div className="truncate font-mono">{d.domain}</div>
        : <div className="text-gray-700 italic">no domain</div>}
      <div><span className="text-gray-700">type </span>{d.recordType || 'A'}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function SmtpSendNode({ data, selected }: NodeProps) {
  const d = data as SmtpSendData;
  return (
    <NodeShell border="border-emerald-500/60" dot="bg-emerald-400" titleColor="#6ee7b7"
      title={d.label || 'SMTP Send'} selected={selected}>
      {d.host
        ? <div className="truncate font-mono"><span className="text-gray-700">host </span>{d.host}:{d.port||587}</div>
        : <div className="text-gray-700 italic">not configured</div>}
      {d.to && <div className="truncate"><span className="text-gray-700">to </span>{d.to}</div>}
    </NodeShell>
  );
}

export function ImapFetchNode({ data, selected }: NodeProps) {
  const d = data as ImapFetchData;
  return (
    <NodeShell border="border-teal-500/60" dot="bg-teal-400" titleColor="#2dd4bf"
      title={d.label || 'IMAP Fetch'} selected={selected}>
      {d.host
        ? <div className="truncate font-mono"><span className="text-gray-700">host </span>{d.host}</div>
        : <div className="text-gray-700 italic">not configured</div>}
      {d.folder && <div><span className="text-gray-700">folder </span>{d.folder}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function CommentNode({ id, data }: NodeProps) {
  const { setNodes, deleteElements } = useReactFlow();
  const d = data as CommentNodeData;
  const w = typeof d.w === 'number' ? d.w : 200;
  const h = typeof d.h === 'number' ? d.h : 120;
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  function patch(update: Partial<CommentNodeData>) {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...update } } : n));
  }

  function onResizeDown(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    startRef.current = { x: e.clientX, y: e.clientY, w, h };
    function onMove(me: MouseEvent) {
      if (!startRef.current) return;
      patch({
        w: Math.max(120, startRef.current.w + me.clientX - startRef.current.x),
        h: Math.max(80,  startRef.current.h + me.clientY - startRef.current.y),
      });
    }
    function onUp() {
      startRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div style={{ width: w, height: h, position: 'relative' }}
      className="flex flex-col bg-amber-400/10 border border-amber-400/30 rounded-lg">
      <div className="flex items-center justify-end h-5 px-1 flex-shrink-0 cursor-grab rounded-t-lg">
        <button
          onClick={() => deleteElements({ nodes: [{ id }] })}
          className="nodrag nopan w-4 h-4 flex items-center justify-center rounded
            text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors text-[10px] leading-none">
          ✕
        </button>
      </div>
      <textarea
        value={typeof d.text === 'string' ? d.text : ''}
        onChange={e => patch({ text: e.target.value })}
        placeholder="Comment…"
        className="nodrag nopan flex-1 bg-transparent resize-none
          px-2 pb-2 text-xs text-amber-200/80 placeholder-amber-200/20 outline-none"
      />
      <div onMouseDown={onResizeDown}
        className="nodrag nopan absolute bottom-0 right-0 w-4 h-4 cursor-se-resize rounded-br-lg"
        style={{ borderRight: '2px solid rgba(251,191,36,0.35)', borderBottom: '2px solid rgba(251,191,36,0.35)' }}
      />
    </div>
  );
}

export function TcpConnectNode({ data, selected }: NodeProps) {
  const d = data as TcpConnectData;
  return (
    <NodeShell border="border-cyan-600/60" dot="bg-cyan-500" titleColor="#06b6d4"
      title={d.label || 'TCP Connect'} selected={selected}>
      {d.host
        ? <div className="truncate font-mono"><span className="text-gray-700">host </span>{d.host}:{d.port}</div>
        : <div className="text-gray-700 italic">no host</div>}
      {d.sendData && <div className="truncate"><span className="text-gray-700">send </span>{d.sendData}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function SshExecuteNode({ data, selected }: NodeProps) {
  const d = data as SshExecuteData;
  return (
    <NodeShell border="border-lime-500/60" dot="bg-lime-400" titleColor="#84cc16"
      title={d.label || 'SSH Execute'} selected={selected}>
      {d.host
        ? <div className="truncate font-mono"><span className="text-gray-700">ssh </span>{d.username||'root'}@{d.host}</div>
        : <div className="text-gray-700 italic">not configured</div>}
      {d.command && <div className="truncate font-mono"><span className="text-gray-700">$ </span>{d.command}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function FtpSftpNode({ data, selected }: NodeProps) {
  const d = data as FtpSftpData;
  return (
    <NodeShell border="border-orange-600/60" dot="bg-orange-500" titleColor="#f97316"
      title={d.label || 'FTP / SFTP'} selected={selected}>
      <div><span className="text-gray-700">proto </span>{(d.protocol||'ftp').toUpperCase()}</div>
      {d.host
        ? <div className="truncate font-mono"><span className="text-gray-700">host </span>{d.host}:{d.port||21}</div>
        : <div className="text-gray-700 italic">no host</div>}
      <div><span className="text-gray-700">op </span>{d.operation||'list'}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function FileReadNode({ data, selected }: NodeProps) {
  const d = data as FileReadData;
  return (
    <NodeShell border="border-sky-500/60" dot="bg-sky-400" titleColor="#38bdf8"
      title={d.label || 'File Read'} selected={selected}>
      {d.path
        ? <div className="truncate font-mono">{d.path}</div>
        : <div className="text-gray-700 italic">no path</div>}
      <div><span className="text-gray-700">mode </span>{d.mode||'lines'}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function FileWriteNode({ data, selected }: NodeProps) {
  const d = data as FileWriteData;
  return (
    <NodeShell border="border-sky-600/60" dot="bg-sky-500" titleColor="#0ea5e9"
      title={d.label || 'File Write'} selected={selected}>
      {d.path
        ? <div className="truncate font-mono">{d.path}</div>
        : <div className="text-gray-700 italic">no path</div>}
      <div><span className="text-gray-700">mode </span>{d.mode||'append'}</div>
    </NodeShell>
  );
}

export function JsonBuildNode({ data, selected }: NodeProps) {
  const d = data as JsonBuildData;
  let count = 0;
  try { count = (JSON.parse(d.fields || '[]') as unknown[]).length; } catch {}
  return (
    <NodeShell border="border-fuchsia-500/60" dot="bg-fuchsia-400" titleColor="#e879f9"
      title={d.label || 'JSON Build'} selected={selected}>
      <div><span className="text-gray-700">fields </span>{count}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function ListOpNode({ data, selected }: NodeProps) {
  const d = data as ListOpData;
  return (
    <NodeShell border="border-purple-600/60" dot="bg-purple-500" titleColor="#a855f7"
      title={d.label || 'List Op'} selected={selected}>
      <div><span className="text-gray-700">op </span>{d.operation||'append'}</div>
      {d.listVar && <div className="truncate"><span className="text-gray-700">list </span>{d.listVar}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function DateTimeNode({ data, selected }: NodeProps) {
  const d = data as DateTimeData;
  return (
    <NodeShell border="border-teal-600/60" dot="bg-teal-500" titleColor="#14b8a6"
      title={d.label || 'Date / Time'} selected={selected}>
      <div><span className="text-gray-700">op </span>{d.operation||'now'}</div>
      {d.operation !== 'now' && d.operation !== 'unix_now' && d.input &&
        <div className="truncate"><span className="text-gray-700">in </span>{d.input}</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

const MATH_SYM: Record<string, string> = {
  add:'+', sub:'−', mul:'×', div:'÷', mod:'%', pow:'^',
  sqrt:'√', abs:'|x|', round:'≈', floor:'⌊⌋', ceil:'⌈⌉',
  min:'min', max:'max', clamp:'clamp',
  log:'ln', log2:'log₂', log10:'log₁₀', to_int:'int()', to_float:'float()',
};
const MATH_UNARY = new Set(['sqrt','abs','round','floor','ceil','log','log2','log10','to_int','to_float']);

export function MathOpNode({ data, selected }: NodeProps) {
  const d = data as MathOpData;
  const sym = MATH_SYM[d.operation||'add'] || d.operation;
  const unary = MATH_UNARY.has(d.operation||'add');
  return (
    <NodeShell border="border-orange-500/60" dot="bg-orange-400" titleColor="#fb923c"
      title={d.label || 'Math'} selected={selected}>
      <div className="font-mono">
        {unary
          ? <><span className="text-orange-600">{sym}</span>({d.a||'a'})</>
          : <>{d.a||'a'} <span className="text-orange-600">{sym}</span> {d.b||'b'}</>}
      </div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function TryCatchNode({ data, selected }: NodeProps) {
  const d = data as TryCatchData;
  return (
    <NodeShell
      border="border-rose-500/60" dot="bg-rose-400" titleColor="#fb7185"
      title={d.label || 'Try / Catch'} selected={selected} hasOutput={false}
      outputHandles={
        <>
          <Handle type="source" position={Position.Bottom} id="try"
            style={{ left: 'calc(50% - 40px)' }} className="!bg-emerald-500" />
          <Handle type="source" position={Position.Bottom} id="catch"
            style={{ left: 'calc(50% + 40px)' }} className="!bg-red-500" />
          <div className="relative mt-1 h-3">
            <span className="absolute text-[9px] text-emerald-600 select-none -translate-x-1/2" style={{ left: 'calc(50% - 40px)' }}>try</span>
            <span className="absolute text-[9px] text-red-600 select-none -translate-x-1/2"     style={{ left: 'calc(50% + 40px)' }}>catch</span>
          </div>
        </>
      }
    />
  );
}

export function WebhookNode({ data, selected }: NodeProps) {
  const d = data as WebhookData;
  return (
    <NodeShell border="border-indigo-600/60" dot="bg-indigo-500" titleColor="#818cf8"
      title={d.label || 'Webhook'} selected={selected}>
      <div><span className="text-gray-700">method </span>{d.method||'POST'}</div>
      {d.url
        ? <div className="truncate font-mono"><span className="text-gray-700">url </span>{d.url}</div>
        : <div className="text-gray-700 italic">no URL</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

const CAPTCHA_SHORT: Record<string, string> = {
  image: 'Image', recaptcha_v2: 'reCAPTCHA v2', recaptcha_v3: 'reCAPTCHA v3',
  hcaptcha: 'hCaptcha', funcaptcha: 'FunCaptcha', turnstile: 'Turnstile', geetest: 'GeeTest',
};

export function CaptchaSolverNode({ data, selected }: NodeProps) {
  const d = data as CaptchaSolverData;
  return (
    <NodeShell border="border-yellow-500/60" dot="bg-yellow-400" titleColor="#facc15"
      title={d.label || 'Captcha Solver'} selected={selected}>
      <div><span className="text-gray-700">via </span>{d.provider||'2captcha'}</div>
      <div><span className="text-gray-700">type </span>{CAPTCHA_SHORT[d.captchaType||'recaptcha_v2']||d.captchaType}</div>
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function TerminalNode({ data, selected }: NodeProps) {
  const d = data as TerminalData;
  const preview = (d.command || '').trim().slice(0, 28);
  return (
    <NodeShell border="border-green-600/60" dot="bg-green-500" titleColor="#4ade80"
      title={d.label || 'Terminal'} selected={selected}>
      {preview
        ? <div className="truncate font-mono text-[9px] text-green-400/80">{preview}{d.command.length > 28 ? '…' : ''}</div>
        : <div className="text-gray-700 italic">no command</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}

export function JsExecuteNode({ data, selected }: NodeProps) {
  const d = data as JsExecuteData;
  const preview = (d.code || '').trim().slice(0, 24);
  return (
    <NodeShell border="border-emerald-600/60" dot="bg-emerald-500" titleColor="#10b981"
      title={d.label || 'JS Execute'} selected={selected}>
      {preview
        ? <div className="truncate font-mono text-[9px]">{preview}…</div>
        : <div className="text-gray-700 italic">no code</div>}
      {d.varName && <div><span className="text-gray-700">▶ </span>{d.varName}</div>}
    </NodeShell>
  );
}


export const nodeTypes = {
  http_request:  RequestNode,
  parse:         ParseNode,
  regex_extract: RegexExtractNode,
  html_select:   HtmlSelectNode,
  xpath_select:  XPathSelectNode,
  json_extract:  JsonExtractNode,
  set_variable:  SetVariableNode,
  random_data:   RandomDataNode,
  list_item:     ListItemNode,
  string_op:     StringOpNode,
  encode_decode: EncodeDecodeNode,
  hash:          HashNode,
  crypto_aes:    CryptoAesNode,
  output:        ConditionNode,
  condition:     ConditionNode,
  if:            IfNode,
  loop:          LoopNode,
  wait:          WaitNode,
  comment:       CommentNode,
  websocket:     WebSocketNode,
  dns_lookup:    DnsLookupNode,
  smtp_send:     SmtpSendNode,
  imap_fetch:    ImapFetchNode,
  tcp_connect:   TcpConnectNode,
  ssh_execute:   SshExecuteNode,
  ftp_sftp:      FtpSftpNode,
  file_read:     FileReadNode,
  file_write:    FileWriteNode,
  json_build:    JsonBuildNode,
  list_op:       ListOpNode,
  date_time:     DateTimeNode,
  math_op:       MathOpNode,
  try_catch:     TryCatchNode,
  webhook:       WebhookNode,
  captcha_solver:CaptchaSolverNode,
  js_execute:    JsExecuteNode,
  terminal:      TerminalNode,
};


export type PaletteItem = {
  type: string; label: string; description: string;
  dot: string; color: string; border: string;
};

export const PALETTE_CATEGORIES: { id: string; label: string; items: PaletteItem[] }[] = [
  {
    id: 'network',
    label: 'Network',
    items: [
      { type: 'http_request', label: 'HTTP Request', description: 'Send an HTTP/HTTPS request',
        dot: 'bg-indigo-400', color: 'text-indigo-300', border: 'border-indigo-500/40' },
      { type: 'websocket',    label: 'WebSocket',    description: 'Connect, send and receive WS messages',
        dot: 'bg-cyan-400',   color: 'text-cyan-300',   border: 'border-cyan-500/40'   },
      { type: 'dns_lookup',   label: 'DNS Lookup',   description: 'Resolve DNS records for a domain',
        dot: 'bg-violet-400', color: 'text-violet-300', border: 'border-violet-500/40' },
      { type: 'smtp_send',    label: 'SMTP Send',    description: 'Send an email via SMTP',
        dot: 'bg-emerald-400',color: 'text-emerald-300',border: 'border-emerald-500/40'},
      { type: 'imap_fetch',   label: 'IMAP Fetch',   description: 'Fetch email messages via IMAP',
        dot: 'bg-teal-400',   color: 'text-teal-300',   border: 'border-teal-500/40'   },
      { type: 'tcp_connect',  label: 'TCP Connect',  description: 'Raw TCP socket send/receive',
        dot: 'bg-cyan-500',   color: 'text-cyan-400',   border: 'border-cyan-600/40'   },
      { type: 'ssh_execute',  label: 'SSH Execute',  description: 'Run a command over SSH',
        dot: 'bg-lime-400',   color: 'text-lime-300',   border: 'border-lime-500/40'   },
      { type: 'ftp_sftp',     label: 'FTP / SFTP',   description: 'Upload, download or list via FTP/SFTP',
        dot: 'bg-orange-500', color: 'text-orange-400', border: 'border-orange-600/40' },
    ],
  },
  {
    id: 'parsing',
    label: 'Parsing',
    items: [
      { type: 'parse',         label: 'Parse',        description: 'Between strings or JSON key',
        dot: 'bg-purple-400', color: 'text-purple-300', border: 'border-purple-500/40' },
      { type: 'regex_extract', label: 'Regex',         description: 'Extract with regex pattern',
        dot: 'bg-purple-400', color: 'text-purple-300', border: 'border-purple-500/40' },
      { type: 'html_select',   label: 'HTML Select',   description: 'CSS selector on response',
        dot: 'bg-purple-400', color: 'text-purple-300', border: 'border-purple-500/40' },
      { type: 'xpath_select',  label: 'XPath',         description: 'XPath query on XML/HTML',
        dot: 'bg-purple-400', color: 'text-purple-300', border: 'border-purple-500/40' },
      { type: 'json_extract',  label: 'JSON Extract',  description: 'Navigate JSON by dot-path with array index support',
        dot: 'bg-purple-400', color: 'text-purple-300', border: 'border-purple-500/40' },
    ],
  },
  {
    id: 'data',
    label: 'Data',
    items: [
      { type: 'set_variable', label: 'Set Variable', description: 'Assign or interpolate a value',
        dot: 'bg-sky-400', color: 'text-sky-300', border: 'border-sky-500/40' },
      { type: 'random_data',  label: 'Random',       description: 'Generate random string/int/email…',
        dot: 'bg-sky-400', color: 'text-sky-300', border: 'border-sky-500/40' },
      { type: 'list_item',    label: 'List Item',    description: 'Pick an item from a list variable',
        dot: 'bg-sky-400', color: 'text-sky-300', border: 'border-sky-500/40' },
      { type: 'json_build',   label: 'JSON Build',   description: 'Construct a JSON object from key/value pairs',
        dot: 'bg-fuchsia-400', color: 'text-fuchsia-300', border: 'border-fuchsia-500/40'  },
      { type: 'list_op',      label: 'List Op',      description: 'Append, filter, sort, join, slice a list',
        dot: 'bg-purple-500',  color: 'text-purple-400',  border: 'border-purple-600/40'   },
      { type: 'date_time',    label: 'Date / Time',  description: 'Get, format, add/subtract, diff dates',
        dot: 'bg-teal-500',    color: 'text-teal-400',    border: 'border-teal-600/40'     },
      { type: 'math_op',      label: 'Math',         description: 'Arithmetic, rounding, min/max/clamp',
        dot: 'bg-orange-400',  color: 'text-orange-300',  border: 'border-orange-500/40'   },
    ],
  },
  {
    id: 'transform',
    label: 'Transform',
    items: [
      { type: 'string_op',    label: 'String Op',    description: 'Replace, trim, split, join…',
        dot: 'bg-orange-400', color: 'text-orange-300', border: 'border-orange-500/40' },
      { type: 'encode_decode',label: 'Encode/Decode',description: 'Base64, URL, HTML, HEX',
        dot: 'bg-orange-400', color: 'text-orange-300', border: 'border-orange-500/40' },
      { type: 'hash',         label: 'Hash',         description: 'MD5, SHA256, HMAC…',
        dot: 'bg-orange-400', color: 'text-orange-300', border: 'border-orange-500/40' },
      { type: 'crypto_aes',   label: 'AES Crypto',   description: 'AES-128/256 ECB/CBC/GCM',
        dot: 'bg-orange-400', color: 'text-orange-300', border: 'border-orange-500/40' },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    items: [
      { type: 'output', label: 'Output', description: 'Evaluate conditions to determine the overall flow outcome',
        dot: 'bg-amber-400', color: 'text-amber-300', border: 'border-amber-500/40' },
      { type: 'if',        label: 'If',        description: 'Branch the flow based on a condition',
        dot: 'bg-sky-400',   color: 'text-sky-300',   border: 'border-sky-500/40'   },
      { type: 'loop',      label: 'Loop',      description: 'Repeat N times or iterate a list',
        dot: 'bg-amber-400', color: 'text-amber-300', border: 'border-amber-500/40' },
      { type: 'wait',      label: 'Wait',       description: 'Pause for N milliseconds',
        dot: 'bg-amber-400', color: 'text-amber-300', border: 'border-amber-500/40' },
      { type: 'try_catch', label: 'Try / Catch', description: 'Branch on success (try) or error (catch)',
        dot: 'bg-rose-400',  color: 'text-rose-300',  border: 'border-rose-500/40'  },
    ],
  },
  {
    id: 'file',
    label: 'File I/O',
    items: [
      { type: 'file_read',  label: 'File Read',  description: 'Read a file — all lines, specific line, or random line',
        dot: 'bg-sky-400',  color: 'text-sky-300',  border: 'border-sky-500/40'  },
      { type: 'file_write', label: 'File Write', description: 'Write or append content to a file',
        dot: 'bg-sky-500',  color: 'text-sky-400',  border: 'border-sky-600/40'  },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    items: [
      { type: 'webhook',        label: 'Webhook',        description: 'POST to Discord, Slack, Telegram or any HTTP endpoint',
        dot: 'bg-indigo-500',   color: 'text-indigo-400',  border: 'border-indigo-600/40'  },
      { type: 'captcha_solver', label: 'Captcha Solver', description: 'Solve reCAPTCHA v2/v3, hCaptcha, Turnstile via API',
        dot: 'bg-yellow-400',   color: 'text-yellow-300',  border: 'border-yellow-500/40'  },
      { type: 'js_execute',     label: 'JS Execute',     description: 'Run arbitrary JavaScript in an isolated sandbox',
        dot: 'bg-emerald-500',  color: 'text-emerald-400', border: 'border-emerald-600/40' },
      { type: 'terminal',       label: 'Terminal',        description: 'Execute a local shell command and capture output',
        dot: 'bg-green-500',    color: 'text-green-400',   border: 'border-green-600/40'   },
    ],
  },
];
