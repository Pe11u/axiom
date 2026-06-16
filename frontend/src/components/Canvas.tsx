import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider,
  addEdge, useNodesState, useEdgesState, useReactFlow, useViewport,
  Controls, MiniMap, Background, BackgroundVariant,
  type Connection, type Node, type Edge, type OnSelectionChangeParams,
  type OnConnectStartParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import {
  CreateJob, StartJob, StopJob, GetResults,
  OpenAxprojDialog, SaveAxprojDialog, ReadTextFile, WriteTextFile,
} from '../../wailsjs/go/main/App';
import { nodeTypes, PALETTE_CATEGORIES, DEFAULT_NODE_DATA, CUSTOM_COLORS, type RequestNodeData } from './canvas/nodeTypes';
import { UA_PRESETS, BROWSER_LABELS } from './canvas/NodeConfigPanel';

let hljsReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let hljsModule: any = null;
async function ensureHljs() {
  if (hljsReady) return hljsModule;
  const [{ default: hljs }, xml, json, js, css] = await Promise.all([
    import('highlight.js/lib/core'),
    import('highlight.js/lib/languages/xml'),
    import('highlight.js/lib/languages/json'),
    import('highlight.js/lib/languages/javascript'),
    import('highlight.js/lib/languages/css'),
  ]);
  await import('highlight.js/styles/github-dark-dimmed.css');
  hljs.registerLanguage('html', xml.default);
  hljs.registerLanguage('json', json.default);
  hljs.registerLanguage('javascript', js.default);
  hljs.registerLanguage('css', css.default);
  hljsReady = true;
  hljsModule = hljs;
  return hljs;
}

export interface FlowSettings {
  tlsProfile:    'chrome' | 'firefox' | 'safari' | 'random';
  uaMode:        'preset' | 'custom' | 'none';
  uaBrowser:     string; uaVersion: string; uaPlatform: string; uaCustom: string;
  rateLimitEnabled: boolean; ratePerSecond: number; burstSize: number;
  backoffCodes:  string; backoffMs: number; maxBackoffMs: number; backoffMultiplier: number; backoffJitter: boolean;
  cookieSession: boolean; cookieJarId: string;
  fingerprintMode: 'none' | 'random' | 'preset';
  fpBrowser:     string; fpOs: string;
  canvasNoise:   boolean; timezone: string; language: string;
  concurrency:   number; timeoutMs: number; followRedirects: boolean; maxRedirects: number;
  retryCount:    number; retryOnCodes: string;
  screenMode:    'native' | 'random' | 'preset';
  screenWidth:   number; screenHeight: number; colorDepth: 24 | 32;
  webglMode:     'none' | 'noise' | 'spoof';
  webglVendor:   string; webglRenderer: string;
  audioNoise:    boolean;
  webrtcMode:    'native' | 'disable' | 'replace';
  webrtcIp:      string;
  hardwareConcurrencyMode:  'native' | 'random' | 'preset';
  hardwareConcurrencyValue: number;
  deviceMemoryMode:         'native' | 'random' | 'preset';
  deviceMemoryValue:        number;
  doNotTrack:    'unset' | '0' | '1';
  referrerPolicy: 'default' | 'no-referrer' | 'same-origin' | 'strict-origin' | 'unsafe-url';
}

const DEFAULT_FLOW_SETTINGS: FlowSettings = {
  tlsProfile: 'chrome', uaMode: 'preset', uaBrowser: 'chrome', uaVersion: '131',
  uaPlatform: 'Windows 10/11', uaCustom: '',
  rateLimitEnabled: false, ratePerSecond: 10, burstSize: 20,
  backoffCodes: '429,503', backoffMs: 2000, maxBackoffMs: 60000, backoffMultiplier: 2, backoffJitter: true,
  cookieSession: false, cookieJarId: 'default',
  fingerprintMode: 'none', fpBrowser: 'chrome', fpOs: 'windows',
  canvasNoise: true, timezone: 'America/New_York', language: 'en-US',
  concurrency: 1, timeoutMs: 30000, followRedirects: true, maxRedirects: 10,
  retryCount: 0, retryOnCodes: '',
  screenMode: 'native', screenWidth: 1920, screenHeight: 1080, colorDepth: 24,
  webglMode: 'none', webglVendor: 'Intel Inc.', webglRenderer: 'Intel Iris OpenGL Engine',
  audioNoise: false,
  webrtcMode: 'disable', webrtcIp: '',
  hardwareConcurrencyMode: 'native', hardwareConcurrencyValue: 8,
  deviceMemoryMode: 'native', deviceMemoryValue: 8,
  doNotTrack: 'unset', referrerPolicy: 'default',
};

interface AppSettings {
  minZoom:            number;
  maxZoom:            number;
  snapToGrid:         boolean;
  gridSize:           number;
  backgroundStyle:    'dots' | 'lines' | 'cross' | 'none';
  showMiniMap:        boolean;
  reduceMotion:       boolean;
  edgeThickness:      number;
  edgeStyle:          'default' | 'straight' | 'step' | 'smoothstep';
  handleShape:        'pill' | 'circle' | 'square';
  handleWidth:        number;
  handleHeight:       number;
  animNodeEntrance:   boolean;
  animEdgeFlow:       boolean;
  animContextMenu:    boolean;
  animPanelTransition: boolean;
  canvasBrightness:   number;
  theme:              string;
  confirmOnDelete:    boolean;
  autoSaveSecs:       number;
  undoLimit:          number;
  showNodeTypeLabel:  boolean;
}

interface ThemeDef {
  label:   string;
  group:   'vivid' | 'pastel' | 'neutral';
  bgBase:  [number,number,number];
  bg1:     string;
  bg2:     string;
  bgForm:  string;
  edge:    string;
  accent:  string;
}
const THEMES: Record<string, ThemeDef> = {
  void:     { label:'Void',     group:'vivid',   bgBase:[15,17,23], bg1:'#181b23', bg2:'#1e2130', bgForm:'#0d0f14', edge:'#6366f1', accent:'#4338ca' },
  midnight: { label:'Midnight', group:'vivid',   bgBase:[8, 11,20], bg1:'#10151e', bg2:'#18202e', bgForm:'#060910', edge:'#3b82f6', accent:'#1d4ed8' },
  eclipse:  { label:'Eclipse',  group:'vivid',   bgBase:[8, 14,12], bg1:'#101a16', bg2:'#162420', bgForm:'#060c0a', edge:'#10b981', accent:'#047857' },
  ember:    { label:'Ember',    group:'vivid',   bgBase:[16,12, 8], bg1:'#1a1510', bg2:'#221c14', bgForm:'#0e0b07', edge:'#f97316', accent:'#c2410c' },
  phantom:  { label:'Phantom',  group:'vivid',   bgBase:[13, 8,18], bg1:'#15101c', bg2:'#1c1626', bgForm:'#0b060f', edge:'#a855f7', accent:'#7e22ce' },
  inferno:  { label:'Inferno',  group:'vivid',   bgBase:[16, 9, 9], bg1:'#1c1212', bg2:'#231818', bgForm:'#0e0808', edge:'#f87171', accent:'#b91c1c' },
  aurora:   { label:'Aurora',   group:'vivid',   bgBase:[10,16,18], bg1:'#141e21', bg2:'#1a262a', bgForm:'#080e10', edge:'#06b6d4', accent:'#0e7490' },
  toxic:    { label:'Toxic',    group:'vivid',   bgBase:[10,16, 8], bg1:'#131e10', bg2:'#192615', bgForm:'#080e07', edge:'#84cc16', accent:'#4d7c0f' },
  lavender: { label:'Lavender', group:'pastel',  bgBase:[14,12,20], bg1:'#181520', bg2:'#1e1b2a', bgForm:'#0c0b12', edge:'#c4b5fd', accent:'#7c3aed' },
  sage:     { label:'Sage',     group:'pastel',  bgBase:[11,15,13], bg1:'#141a16', bg2:'#1a2118', bgForm:'#090e0b', edge:'#86efac', accent:'#16a34a' },
  blush:    { label:'Blush',    group:'pastel',  bgBase:[18,13,14], bg1:'#1e1618', bg2:'#261c1d', bgForm:'#100c0d', edge:'#fda4af', accent:'#be185d' },
  arctic:   { label:'Arctic',   group:'pastel',  bgBase:[9, 15,18], bg1:'#111b1f', bg2:'#172329', bgForm:'#07100e', edge:'#a5f3fc', accent:'#0891b2' },
  honey:    { label:'Honey',    group:'pastel',  bgBase:[18,15, 8], bg1:'#1c1a10', bg2:'#252215', bgForm:'#100e08', edge:'#fde68a', accent:'#b45309' },
  sakura:   { label:'Sakura',   group:'pastel',  bgBase:[18,13,16], bg1:'#1e1518', bg2:'#261b21', bgForm:'#100c0e', edge:'#fbcfe8', accent:'#9d174d' },
  ocean:    { label:'Ocean',    group:'pastel',  bgBase:[10,14,20], bg1:'#131a22', bg2:'#19222e', bgForm:'#080c12', edge:'#7dd3fc', accent:'#0369a1' },
  grape:    { label:'Grape',    group:'pastel',  bgBase:[16,11,20], bg1:'#1a1422', bg2:'#21192c', bgForm:'#0e0a12', edge:'#e9d5ff', accent:'#7e22ce' },
  peach:    { label:'Peach',    group:'pastel',  bgBase:[19,14,11], bg1:'#1e1814', bg2:'#271f1a', bgForm:'#110d0b', edge:'#fed7aa', accent:'#c2410c' },
  mint:     { label:'Mint',     group:'pastel',  bgBase:[10,18,16], bg1:'#13201e', bg2:'#192926', bgForm:'#080e0d', edge:'#6ee7b7', accent:'#047857' },
  lilac:    { label:'Lilac',    group:'pastel',  bgBase:[16,13,19], bg1:'#1a1620', bg2:'#211c2a', bgForm:'#0e0b11', edge:'#ddd6fe', accent:'#6d28d9' },
  slate:    { label:'Slate',    group:'neutral', bgBase:[14,16,18], bg1:'#191c1f', bg2:'#1f2327', bgForm:'#0d0f11', edge:'#94a3b8', accent:'#475569' },
  charcoal: { label:'Charcoal', group:'neutral', bgBase:[16,15,14], bg1:'#1b1a19', bg2:'#23211f', bgForm:'#0f0e0d', edge:'#d6d3d1', accent:'#78716c' },
  obsidian: { label:'Obsidian', group:'neutral', bgBase:[14,14,14], bg1:'#191919', bg2:'#202020', bgForm:'#0e0e0e', edge:'#6b7280', accent:'#374151' },
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  minZoom: 0.5, maxZoom: 2,
  snapToGrid: false, gridSize: 20,
  backgroundStyle: 'dots', showMiniMap: false,
  reduceMotion: false,
  edgeThickness: 4, edgeStyle: 'default',
  handleShape: 'pill', handleWidth: 22, handleHeight: 9,
  animNodeEntrance: true, animEdgeFlow: false, animContextMenu: true, animPanelTransition: true,
  canvasBrightness: 0,
  theme: 'void',
  confirmOnDelete: false,
  autoSaveSecs: 0, undoLimit: 50,
  showNodeTypeLabel: true,
};

function getConnectedComponents(nodes: Node[], edges: Edge[]): Node[][] {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  const visited = new Set<string>();
  const components: Node[][] = [];
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const component: Node[] = [];
    const queue = [node.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const n = nodes.find(n => n.id === id);
      if (n) component.push(n);
      adj.get(id)?.forEach(nid => { if (!visited.has(nid)) queue.push(nid); });
    }
    components.push(component);
  }
  return components;
}

function varFields(type: string | undefined): string[] {
  if (!type) return [];
  if (type === 'loop') return ['indexVar', 'itemVar'];
  if (['http_request', 'output', 'condition', 'wait', 'comment', 'smtp_send',
       'file_write', 'try_catch', 'rate_limiter'].includes(type)) return [];
  return ['varName'];
}

function topoSort(nodes: Node[], edges: Edge[]): Node[] {
  const inDeg = new Map<string, number>(nodes.map(n => [n.id, 0]));
  const adj = new Map<string, string[]>(nodes.map(n => [n.id, []]));
  for (const e of edges) {
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  }
  const queue = nodes.filter(n => (inDeg.get(n.id) ?? 0) === 0).map(n => n.id);
  const order: Node[] = [];
  const byId = new Map(nodes.map(n => [n.id, n]));
  while (queue.length) {
    const id = queue.shift()!;
    const n = byId.get(id);
    if (n) order.push(n);
    for (const nxt of adj.get(id) ?? []) {
      const d = (inDeg.get(nxt) ?? 1) - 1;
      inDeg.set(nxt, d);
      if (d === 0) queue.push(nxt);
    }
  }
  for (const n of nodes) if (!order.includes(n)) order.push(n);
  return order;
}

function buildAvailableVars(nodes: Node[], edges: Edge[]): VarGroup[] {
  const ordered = topoSort(nodes, edges);
  const httpMap = new Map<string, VarGroup>();
  const varMap = new Map<string, string>();
  for (const n of ordered) {
    if (n.type === 'http_request') {
      const lbl = ((n.data as RequestNodeData).label || 'HTTP Request');
      httpMap.set(lbl, {
        label: lbl,
        items: ['Body', 'Status', 'RSHeader', 'RQHeader', 'Cookie'].map(s => ({
          display: s,
          value: `${lbl}: ${s}`,
        })),
      });
    } else {
      for (const f of varFields(n.type)) {
        const vn = (n.data as Record<string, unknown>)[f];
        if (typeof vn === 'string' && vn) varMap.set(vn, vn);
      }
    }
  }
  const groups: VarGroup[] = [
    { label: 'Default', items: [{ display: 'User', value: 'User' }, { display: 'Pass', value: 'Pass' }] },
    ...httpMap.values(),
  ];
  if (varMap.size) {
    groups.push({
      label: 'Variables',
      items: [...varMap.values()].map(vn => ({ display: vn, value: vn })),
    });
  }
  return groups;
}
import { NodeConfigPanel, type VarGroup } from './canvas/NodeConfigPanel';
import { EditableList } from './EditableList';
import { zoomIn, zoomOut, zoomReset } from '../pageZoom';


interface SavedFlow { name: string; nodes: Node[]; edges: Edge[] }
const STORAGE_KEY = 'axiom:canvas:v2';

function loadFlows(): Record<string, SavedFlow> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}
function saveFlows(flows: Record<string, SavedFlow>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
}


const STARTER_NODES: Node[] = [
  { id: 'req-1',   type: 'http_request', position: { x: 80, y: 60  }, data: { label: 'HTTP Request', method: 'GET', url: '', tlsProfile: 'chrome_146', headers: '', body: '' } },
  { id: 'parse-1', type: 'parse',        position: { x: 80, y: 210 }, data: { label: 'Parse', parseType: 'between', startStr: '', endStr: '', jsonKey: '', varName: 'value' } },
  { id: 'cond-1',  type: 'output',    position: { x: 80, y: 360 }, data: { label: 'Output', branches: [
    { id: 'success', label: 'SUCCESS', color: '#22c55e', logic: 'and', rules: [{ field: 'status_code', fieldName: '', op: 'eq', value: '200' }] },
    { id: 'fail',    label: 'FAIL',    color: '#ef4444', logic: 'or',  rules: [{ field: 'status_code', fieldName: '', op: 'neq', value: '200' }] },
  ] } },
];
const STARTER_EDGES: Edge[] = [
  { id: 'e1', source: 'req-1',   target: 'parse-1', style: { stroke: '#6366f1', strokeWidth: 2 } },
  { id: 'e2', source: 'parse-1', target: 'cond-1',  style: { stroke: '#6366f1', strokeWidth: 2 } },
];


interface RunConfig {
  proxyMode:    'none' | 'round_robin' | 'random';
  proxyList:    string[];
  concurrency:  number;
  timeoutSecs:  number;
  retryCount:   number;
  retryOnCodes: string;
  debugUser:    string;
  debugPass:    string;
}
const DEFAULT_RUN: RunConfig = {
  proxyMode: 'none', proxyList: [], concurrency: 50,
  timeoutSecs: 30, retryCount: 2, retryOnCodes: '429,503',
  debugUser: '', debugPass: '',
};

interface BulkRunConfig {
  activeDataSetId:      string | null;
  activeProxyPresetId:  string | null;
  manualUser:           string;
  manualPass:           string;
  concurrency:          number;
  timeoutSecs:          number;
  retryCount:           number;
  retryOnCodes:         string;
}
const DEFAULT_BULK_RUN: BulkRunConfig = {
  activeDataSetId: null, activeProxyPresetId: null,
  manualUser: '', manualPass: '',
  concurrency: 50, timeoutSecs: 30, retryCount: 2, retryOnCodes: '429,503',
};
interface DataSet {
  id: string;
  name: string;
  delimiter: string;
  entries: string[];
}
interface ProxyPreset {
  id:   string;
  name: string;
  mode: 'round_robin' | 'random';
  list: string[];
}

interface LogField  { label: string; value: string; expandable?: boolean }
interface LogStep   { nodeType: string; nodeLabel: string; fields: LogField[]; durationMs?: number; error?: string }
interface CapturedVar { name: string; value: string; hidden?: boolean }
interface RunResult {
  target: string; statusCode: number; bodySnippet: string;
  latency: number; proxyUsed: string; error?: string; timestamp: string;
  outputBranch?: string;
  capturedVars?: CapturedVar[];
  logSteps?: LogStep[];
}
interface LiveRun {
  jobId: string;
  done: number; total: number; hits: number; fails: number; avgLatency: number;
  status: string;
}


function CanvasInner() {
  const wrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, getEdges, setCenter, getViewport, fitView } = useReactFlow();

  const historyRef   = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const futureRef    = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const [flowName, setFlowName]   = useState('default');
  const [editName, setEditName]   = useState(false);
  const [nameVal,  setNameVal]    = useState('default');
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editName) { const t = setTimeout(() => nameRef.current?.focus(), 30); return () => clearTimeout(t); }
  }, [editName]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode]  = useState<Node | null>(null);

  useEffect(() => {
    const assigned = new Set<string>();
    const updates: { id: string; field: string; name: string }[] = [];
    for (const n of nodes) {
      for (const field of varFields(n.type)) {
        const cur = (n.data as Record<string, unknown>)[field];
        if (typeof cur !== 'string' || !cur) continue;
        if (!assigned.has(cur)) {
          assigned.add(cur);
        } else {
          let i = 2;
          while (assigned.has(`${cur}_${i}`)) i++;
          const next = `${cur}_${i}`;
          assigned.add(next);
          updates.push({ id: n.id, field, name: next });
        }
      }
    }
    if (!updates.length) return;
    setNodes(ns => ns.map(n => {
      const u = updates.find(u => u.id === n.id);
      return u ? { ...n, data: { ...n.data, [u.field]: u.name } } : n;
    }));
    setSelectedNode(prev => {
      if (!prev) return prev;
      const u = updates.find(u => u.id === prev.id);
      return u ? { ...prev, data: { ...prev.data, [u.field]: u.name } } : prev;
    });
  }, [nodes, setNodes]);

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-49), { nodes: getNodes(), edges: getEdges() }];
    futureRef.current  = [];
  }, [getNodes, getEdges]);

  const undo = useCallback(() => {
    if (!historyRef.current.length) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    futureRef.current  = [{ nodes: getNodes(), edges: getEdges() }, ...futureRef.current.slice(0, 49)];
    historyRef.current = historyRef.current.slice(0, -1);
    setNodes(prev.nodes); setEdges(prev.edges); setSelectedNode(null);
  }, [getNodes, getEdges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (!futureRef.current.length) return;
    const next = futureRef.current[0];
    historyRef.current = [...historyRef.current.slice(-49), { nodes: getNodes(), edges: getEdges() }];
    futureRef.current  = futureRef.current.slice(1);
    setNodes(next.nodes); setEdges(next.edges); setSelectedNode(null);
  }, [getNodes, getEdges, setNodes, setEdges]);
  const [paletteOpen, setPaletteOpen]    = useState(() => localStorage.getItem('axiom:view:palette') !== 'false');
  const [leftTab, setLeftTab]            = useState<'presets' | 'flow' | 'run' | 'dataset' | 'proxy' | 'settings'>('flow');
  const [settingsSubTab, setSettingsSubTab] = useState<'preset' | 'app'>('preset');
  const [flowSettings, setFlowSettings]  = useState<FlowSettings>(() => {
    try { return { ...DEFAULT_FLOW_SETTINGS, ...JSON.parse(localStorage.getItem('axiom:flowSettings') ?? '{}') }; }
    catch { return DEFAULT_FLOW_SETTINGS; }
  });
  const [bulkCfg, setBulkCfg]           = useState<BulkRunConfig>(DEFAULT_BULK_RUN);
  const [datasets, setDatasets]          = useState<DataSet[]>(() => {
    try { return JSON.parse(localStorage.getItem('axiom:datasets') ?? '[]'); }
    catch { return []; }
  });
  const [appSettings, setAppSettings]    = useState<AppSettings>(() => {
    try { return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(localStorage.getItem('axiom:appSettings') ?? '{}') }; }
    catch { return DEFAULT_APP_SETTINGS; }
  });
  const [proxyPresets, setProxyPresets]  = useState<ProxyPreset[]>(() => {
    try { return JSON.parse(localStorage.getItem('axiom:proxyPresets') ?? '[]'); }
    catch { return []; }
  });
  const [bulkJobId, setBulkJobId]       = useState<string | null>(null);
  const bulkJobIdRef                    = useRef<string | null>(null);
  useEffect(() => { bulkJobIdRef.current = bulkJobId; }, [bulkJobId]);
  const [bulkProgress, setBulkProgress] = useState<LiveRun | null>(null);
  const [bulkResults, setBulkResults]   = useState<RunResult[]>([]);
  const [bulkSearch, setBulkSearch]     = useState('');
  const [bulkPage, setBulkPage]         = useState(0);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [flowNames, setFlowNames]        = useState<string[]>([]);

  useEffect(() => {
    const flows = loadFlows();
    const saved = flows[flowName];
    setNodes(saved?.nodes ?? STARTER_NODES);
    setEdges(saved?.edges ?? STARTER_EDGES);
    setSelectedNode(null);
    setFlowNames(Object.keys(flows));
  }, [flowName]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const flows = loadFlows();
      flows[flowName] = { name: flowName, nodes, edges };
      saveFlows(flows);
    }, 800);
  }, [nodes, edges, flowName]);

  const handleNodesChange: typeof onNodesChange = useCallback(changes => {
    onNodesChange(changes);
    setSelectedNode(prev => {
      if (!prev) return null;
      return changes.some(c => c.type === 'remove' && c.id === prev.id) ? null : prev;
    });
  }, [onNodesChange]);

  const sh = (h: string | null | undefined) => h ?? null;

  const isValidConnection = useCallback((c: Edge | Connection) => {
    return !getEdges().some(e => e.target === c.target && sh(e.targetHandle) === sh(c.targetHandle));
  }, [getEdges]);

  const onConnectStart = useCallback(
    (_: unknown, { nodeId, handleId, handleType }: OnConnectStartParams) => {
      if (handleType !== 'source' || !nodeId) return;
      const existing = getEdges().find(e => e.source === nodeId && sh(e.sourceHandle) === sh(handleId));
      if (existing) {
        pushHistory();
        setEdges(es => es.filter(e => e.id !== existing.id));
      }
    },
    [getEdges, setEdges, pushHistory],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      pushHistory();
      setEdges(es => {
        const deduped = es.filter(e => !(e.source === c.source && sh(e.sourceHandle) === sh(c.sourceHandle)));
        return addEdge({ ...c, style: { stroke: '#6366f1', strokeWidth: 2 } }, deduped);
      });
    },
    [setEdges, pushHistory],
  );

  const onSelectionChange = useCallback(({ nodes: sel }: OnSelectionChangeParams) => {
    const configurable = sel.filter(n => n.type !== 'comment');
    setSelectedNode(configurable.length === 1 ? configurable[0] : null);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
  }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    if (!type) return;
    pushHistory();
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setNodes(ns => {
      if (type === 'output' && ns.some(n => n.type === 'output' || n.type === 'condition')) return ns;
      return [...ns, {
        id: `${type}-${Date.now()}`, type, position,
        data: { ...(DEFAULT_NODE_DATA[type] as Record<string, unknown>) },
      }];
    });
  }, [screenToFlowPosition, setNodes, pushHistory]);

  const onNodeDataChange = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data } : n));
    setSelectedNode(prev => prev?.id === id ? { ...prev, data } : prev);
  }, [setNodes]);

  const [confirmNodeDelete, setConfirmNodeDelete] = useState<{ ids: string[]; label: string } | null>(null);
  const [nodeDeleteReady,   setNodeDeleteReady]   = useState(false);
  const nodeDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openNodeDeleteConfirm = useCallback((ids: string[], label: string) => {
    setConfirmNodeDelete({ ids, label });
    setNodeDeleteReady(false);
    if (nodeDeleteTimerRef.current) clearTimeout(nodeDeleteTimerRef.current);
    nodeDeleteTimerRef.current = setTimeout(() => setNodeDeleteReady(true), 250);
  }, []);

  const onNodeDelete = useCallback((id: string) => {
    if (appSettings.confirmOnDelete) { openNodeDeleteConfirm([id], '1 node'); return; }
    pushHistory();
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges, pushHistory, appSettings.confirmOnDelete, openNodeDeleteConfirm]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    onNodeDelete(node.id);
  }, [onNodeDelete]);

  const pasteNodes = useCallback((clipboard: { nodes: Node[]; edges: Edge[] }) => {
    pushHistory();
    const ts = Date.now();
    const idMap = new Map<string, string>();
    const eligibleNodes = clipboard.nodes;
    eligibleNodes.forEach((n, i) => { idMap.set(n.id, `${n.type}-${ts}-${i}`); });
    const allNewNodes = eligibleNodes.map(n => ({
      ...n, id: idMap.get(n.id)!, position: { x: n.position.x + 30, y: n.position.y + 30 }, selected: true,
    }));
    const newEdges = clipboard.edges.map((e, i) => ({
      ...e, id: `e-${ts}-${i}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));
    setNodes(ns => {
      const hasOutput = ns.some(n => n.type === 'output' || n.type === 'condition');
      const newNodes = allNewNodes.filter(n => !(n.type === 'output' && hasOutput));
      const pastedIds = new Set(newNodes.map(n => n.id));
      const filteredEdges = newEdges.filter(e => pastedIds.has(e.source) && pastedIds.has(e.target));
      setEdges(es => [...es, ...filteredEdges]);
      return [...ns.map(n => ({ ...n, selected: false })), ...newNodes];
    });
  }, [pushHistory, setNodes, setEdges]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (!inInput && e.ctrlKey && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
      if (!inInput && e.ctrlKey &&  e.shiftKey && e.key === 'Z') { e.preventDefault(); redo(); return; }
      if (!inInput && e.ctrlKey && !e.shiftKey && e.key === 'y') { e.preventDefault(); redo(); return; }

      if (inInput) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = getNodes().filter(n => n.selected).map(n => n.id);
        if (!ids.length) return;
        if (appSettings.confirmOnDelete) {
          openNodeDeleteConfirm(ids, `${ids.length} node${ids.length > 1 ? 's' : ''}`);
          return;
        }
        pushHistory();
        setNodes(ns => ns.filter(n => !n.selected));
        setEdges(es => es.filter(ev => !ids.includes(ev.source) && !ids.includes(ev.target)));
        setSelectedNode(null);
        return;
      }

      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        setNodes(ns => ns.map(n => ({ ...n, selected: true })));
        return;
      }

      if (e.ctrlKey && e.key === 'c') {
        const selected = getNodes().filter(n => n.selected);
        if (!selected.length) return;
        const selectedIds = new Set(selected.map(n => n.id));
        clipboardRef.current = {
          nodes: selected,
          edges: getEdges().filter(ev => selectedIds.has(ev.source) && selectedIds.has(ev.target)),
        };
        return;
      }

      if (e.ctrlKey && e.key === 'v') {
        if (!clipboardRef.current) return;
        pasteNodes(clipboardRef.current);
        clipboardRef.current = {
          nodes: clipboardRef.current.nodes.map(n => ({ ...n, position: { x: n.position.x + 30, y: n.position.y + 30 } })),
          edges: clipboardRef.current.edges,
        };
        return;
      }

      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        const selected = getNodes().filter(n => n.selected);
        if (!selected.length) return;
        const selectedIds = new Set(selected.map(n => n.id));
        pasteNodes({
          nodes: selected,
          edges: getEdges().filter(ev => selectedIds.has(ev.source) && selectedIds.has(ev.target)),
        });
        return;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [getNodes, getEdges, setNodes, setEdges, pushHistory, undo, redo, pasteNodes, appSettings.confirmOnDelete, openNodeDeleteConfirm]);

  interface SelBox { sx: number; sy: number; ex: number; ey: number }
  const [selBox,  setSelBox]  = useState<SelBox | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const rcStartRef = useRef<{ x: number; y: number } | null>(null);

  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('axiom:panelWidth');
    return saved ? Math.max(200, Math.min(600, Number(saved))) : 384;
  });
  const panelDragRef = useRef<{ startX: number; startW: number } | null>(null);
  function onPanelDragStart(e: React.MouseEvent) {
    e.preventDefault();
    panelDragRef.current = { startX: e.clientX, startW: panelWidth };
    function onMove(ev: MouseEvent) {
      if (!panelDragRef.current) return;
      const delta = panelDragRef.current.startX - ev.clientX;
      const w = Math.max(200, Math.min(600, panelDragRef.current.startW + delta));
      setPanelWidth(w);
    }
    function onUp(ev: MouseEvent) {
      if (panelDragRef.current) {
        const delta = panelDragRef.current.startX - ev.clientX;
        const w = Math.max(200, Math.min(600, panelDragRef.current.startW + delta));
        localStorage.setItem('axiom:panelWidth', String(w));
      }
      panelDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function applyAreaSelect(sx: number, sy: number, ex: number, ey: number) {
    const p1 = screenToFlowPosition({ x: Math.min(sx, ex), y: Math.min(sy, ey) });
    const p2 = screenToFlowPosition({ x: Math.max(sx, ex), y: Math.max(sy, ey) });
    setNodes(ns => ns.map(n => {
      const w = (n.measured as { width?: number } | undefined)?.width  ?? 180;
      const h = (n.measured as { height?: number } | undefined)?.height ?? 80;
      const ox = Math.max(0, Math.min(p2.x, n.position.x + w) - Math.max(p1.x, n.position.x));
      const oy = Math.max(0, Math.min(p2.y, n.position.y + h) - Math.max(p1.y, n.position.y));
      return { ...n, selected: ox * oy > w * h * 0.5 };
    }));
  }

  function autoSort() {
    const ns = getNodes(); const es = getEdges();
    const COL_W = 156, H_GAP = 60, V_GAP = 80, MAX_PER_ROW = 3, NODE_GAP = 48;

    const nodeWidth = (node: typeof ns[number]) => {
      const type = node.type ?? '';
      const d = node.data as any;
      if (['output', 'condition', 'if'].includes(type)) {
        const brs: { label: string }[] = Array.isArray(d?.branches) && d.branches.length > 0
          ? d.branches
          : type === 'if' ? [{ label: 'TRUE' }, { label: 'FALSE' }] : [{ label: 'SUCCESS' }, { label: 'FAIL' }];
        const bw = brs.reduce((s: number, b: { label: string }) => s + Math.max(25, b.label.length * 7), 0)
          + Math.max(0, brs.length - 1) * 10;
        return Math.max(180, bw + 26);
      }
      return node.measured?.width ?? 220;
    };

    const adj = new Map<string, Set<string>>();
    for (const n of ns) adj.set(n.id, new Set());
    for (const e of es) { adj.get(e.source)?.add(e.target); adj.get(e.target)?.add(e.source); }
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const n of ns) {
      if (visited.has(n.id)) continue;
      const comp: string[] = [];
      const q = [n.id];
      while (q.length) {
        const id = q.shift()!;
        if (visited.has(id)) continue;
        visited.add(id); comp.push(id);
        for (const nb of (adj.get(id) ?? [])) if (!visited.has(nb)) q.push(nb);
      }
      components.push(comp);
    }

    const compLayouts = components.map(comp => {
      const compSet = new Set(comp);
      const cEdges = es.filter(e => compSet.has(e.source) && compSet.has(e.target));
      const indeg = new Map<string, number>(comp.map(id => [id, 0]));
      for (const e of cEdges) indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
      const layer = new Map<string, number>();
      const q: { id: string; d: number }[] = comp.filter(id => !indeg.get(id)).map(id => ({ id, d: 0 }));
      while (q.length) {
        const { id, d } = q.shift()!;
        if (layer.has(id)) continue;
        layer.set(id, d);
        cEdges.filter(e => e.source === id).forEach(e => { if (!layer.has(e.target)) q.push({ id: e.target, d: d + 1 }); });
      }
      for (const id of comp) if (!layer.has(id)) layer.set(id, 0);

      const byLayer = new Map<number, string[]>();
      for (const [id, l] of layer) { if (!byLayer.has(l)) byLayer.set(l, []); byLayer.get(l)!.push(id); }

      const layerMaxH = new Map<number, number>();
      for (const [id, l] of layer) {
        const node = ns.find(n => n.id === id)!;
        const h = node.measured?.height ?? 60;
        layerMaxH.set(l, Math.max(layerMaxH.get(l) ?? 0, h));
      }
      const maxLayer = layer.size > 0 ? Math.max(...layer.values()) : 0;
      const layerY = new Map<number, number>();
      let cumY = 0;
      for (let i = 0; i <= maxLayer; i++) {
        layerY.set(i, cumY);
        cumY += (layerMaxH.get(i) ?? 60) + NODE_GAP;
      }

      const relPos = new Map<string, { x: number; y: number }>();
      for (const [l, ids] of byLayer) {
        const startX = -((ids.length - 1) * COL_W) / 2;
        ids.forEach((id, i) => {
          const node = ns.find(n => n.id === id)!;
          const w = nodeWidth(node);
          relPos.set(id, { x: startX + i * COL_W - w / 2, y: layerY.get(l) ?? 0 });
        });
      }

      const allX = comp.map(id => relPos.get(id)!.x);
      const allXR = comp.map(id => relPos.get(id)!.x + nodeWidth(ns.find(n => n.id === id)!));
      const minX = Math.min(...allX);
      const compW = Math.max(...allXR) - minX;
      const compH = cumY - NODE_GAP;
      return { relPos, minX, compW, compH };
    });

    const pos = new Map<string, { x: number; y: number }>();
    let rowX = 0, rowY = 0, rowMaxH = 0, rowCount = 0;
    for (const { relPos, minX, compW, compH } of compLayouts) {
      if (rowCount > 0 && rowCount >= MAX_PER_ROW) {
        rowX = 0; rowY += rowMaxH + V_GAP; rowMaxH = 0; rowCount = 0;
      }
      const offX = rowX - minX;
      for (const [id, p] of relPos) pos.set(id, { x: p.x + offX, y: p.y + rowY });
      rowX += compW + H_GAP;
      rowMaxH = Math.max(rowMaxH, compH);
      rowCount++;
    }

    pushHistory();
    setNodes(ns.map(n => ({ ...n, position: pos.get(n.id) ?? n.position })));
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
  }

  function removeIsolated() {
    const ns = getNodes(); const es = getEdges();
    const connected = new Set<string>();
    for (const e of es) { connected.add(e.source); connected.add(e.target); }
    const toRemove = new Set(ns.filter(n => !connected.has(n.id)).map(n => n.id));
    if (!toRemove.size) return;
    pushHistory();
    setNodes(ns.filter(n => !toRemove.has(n.id)));
    setSelectedNode(prev => prev && toRemove.has(prev.id) ? null : prev);
  }

  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    function onMD(e: MouseEvent) {
      if (e.button !== 2) return;
      if ((e.target as Element).closest('.react-flow__node')) return;
      e.preventDefault();
      rcStartRef.current = { x: e.clientX, y: e.clientY };
    }
    function onMM(e: MouseEvent) {
      if (!rcStartRef.current) return;
      const dx = e.clientX - rcStartRef.current.x;
      const dy = e.clientY - rcStartRef.current.y;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        setCtxMenu(null);
        setSelBox({ sx: rcStartRef.current.x, sy: rcStartRef.current.y, ex: e.clientX, ey: e.clientY });
      }
    }
    function onMU(e: MouseEvent) {
      if (e.button !== 2 || !rcStartRef.current) return;
      const dx = Math.abs(e.clientX - rcStartRef.current.x);
      const dy = Math.abs(e.clientY - rcStartRef.current.y);
      if (dx < 5 && dy < 5) {
        setCtxMenu({ x: e.clientX, y: e.clientY });
      } else if (selBoxRef.current) {
        const { sx, sy, ex, ey } = selBoxRef.current;
        applyAreaSelect(sx, sy, ex, ey);
      }
      rcStartRef.current = null;
      setSelBox(null);
    }
    el.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup',   onMU);
    return () => { el.removeEventListener('mousedown', onMD); window.removeEventListener('mousemove', onMM); window.removeEventListener('mouseup', onMU); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftTab]);

  useEffect(() => { localStorage.setItem('axiom:datasets',     JSON.stringify(datasets));     }, [datasets]);
  useEffect(() => { localStorage.setItem('axiom:proxyPresets', JSON.stringify(proxyPresets)); }, [proxyPresets]);
  useEffect(() => { localStorage.setItem('axiom:appSettings',  JSON.stringify(appSettings));  }, [appSettings]);

  const selBoxRef = useRef<SelBox | null>(null);
  useEffect(() => { selBoxRef.current = selBox; }, [selBox]);

  useEffect(() => {
    if (!ctxMenu) return;
    function closeClick(e: MouseEvent) {
      if ((e.target as Element).closest('[data-ctx-menu]')) return;
      setCtxMenu(null);
    }
    function closeDismiss() { setCtxMenu(null); }
    window.addEventListener('mousedown', closeClick, true);
    window.addEventListener('blur',      closeDismiss);
    window.addEventListener('scroll',    closeDismiss, true);
    window.addEventListener('resize',    closeDismiss);
    return () => {
      window.removeEventListener('mousedown', closeClick, true);
      window.removeEventListener('blur',      closeDismiss);
      window.removeEventListener('scroll',    closeDismiss, true);
      window.removeEventListener('resize',    closeDismiss);
    };
  }, [ctxMenu]);

  function newFlow() {
    const base = 'New Preset';
    const existing = new Set(Object.keys(loadFlows()));
    let name = base;
    let n = 2;
    while (existing.has(name)) { name = `${base} ${n++}`; }
    setFlowName(name); setNameVal(name);
  }
  function deleteFlow() {
    const flows = loadFlows();
    delete flows[flowName];
    saveFlows(flows);
    const names = Object.keys(flows);
    setFlowNames(names);
    const next = names[0] ?? 'default';
    setFlowName(next); setNameVal(next);
    if (!names.length) { setNodes(STARTER_NODES); setEdges(STARTER_EDGES); }
  }
  function deleteFlowByName(name: string) {
    const flows = loadFlows();
    delete flows[name];
    saveFlows(flows);
    const names = Object.keys(flows);
    setFlowNames(names);
    if (name === flowName) {
      const next = names[0] ?? 'default';
      setFlowName(next); setNameVal(next);
      if (!names.length) { setNodes(STARTER_NODES); setEdges(STARTER_EDGES); }
    }
  }
  function clearCanvas() { setNodes([]); setEdges([]); setSelectedNode(null); }
  function commitRename() {
    const t = nameVal.trim();
    if (!t || t === flowName) { setEditName(false); return; }
    const flows = loadFlows();
    const cur = flows[flowName];
    if (cur) { flows[t] = { ...cur, name: t }; delete flows[flowName]; saveFlows(flows); }
    setFlowName(t); setEditName(false); setFlowNames(Object.keys(loadFlows()));
  }

  const showMiniMap = appSettings.showMiniMap;
  const [canvasBgColor, canvasDotColor, themeEdgeColor] = useMemo(() => {
    const t = THEMES[appSettings.theme] ?? THEMES.void;
    const dotOffset = [15, 16, 25];
    const adj = Math.round(appSettings.canvasBrightness);
    const bg      = t.bgBase.map(c => Math.max(0, Math.min(255, c + adj)));
    const dotBase = t.bgBase.map((c, i) => c + dotOffset[i]);
    const dot     = dotBase.map(c => Math.max(0, Math.min(255, c - adj)));
    return [
      `rgb(${bg[0]},${bg[1]},${bg[2]})`,
      `rgb(${dot[0]},${dot[1]},${dot[2]})`,
      t.edge,
    ];
  }, [appSettings.canvasBrightness, appSettings.theme]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--ax-edge-width',    String(appSettings.edgeThickness));
    const hh = appSettings.handleHeight;
    r.style.setProperty('--ax-handle-h',      `${hh}px`);
    r.style.setProperty('--ax-handle-w',
      appSettings.handleShape === 'circle' ? `${hh}px` : `${appSettings.handleWidth}px`);
    r.style.setProperty('--ax-handle-radius',
      appSettings.handleShape === 'pill'   ? `${hh / 2}px` :
      appSettings.handleShape === 'circle' ? '50%' : '2px');
    const rm = appSettings.reduceMotion;
    r.classList.toggle('ax-reduce-motion',       rm);
    r.classList.toggle('ax-no-node-anim',        !appSettings.animNodeEntrance    || rm);
    r.classList.toggle('ax-edge-flow',             appSettings.animEdgeFlow         && !rm);
    r.classList.toggle('ax-no-ctx-anim',         !appSettings.animContextMenu     || rm);
    r.classList.toggle('ax-no-panel-anim',       !appSettings.animPanelTransition || rm);
    const t = THEMES[appSettings.theme] ?? THEMES.void;
    const bg0 = `rgb(${t.bgBase.join(',')})`;
    r.style.setProperty('--ax-bg-0',         bg0);
    r.style.setProperty('--ax-bg-1',         t.bg1);
    r.style.setProperty('--ax-bg-2',         t.bg2);
    r.style.setProperty('--ax-bg-form',      t.bgForm);
    r.style.setProperty('--ax-canvas-bg',    canvasBgColor);
    r.style.setProperty('--ax-canvas-dot',   canvasDotColor);
    r.style.setProperty('--ax-edge-color',   themeEdgeColor);
    r.style.setProperty('--ax-accent',       t.accent);
  }, [appSettings.edgeThickness, appSettings.handleShape, appSettings.handleWidth,
      appSettings.handleHeight, appSettings.reduceMotion, appSettings.animNodeEntrance,
      appSettings.animEdgeFlow, appSettings.animContextMenu, appSettings.animPanelTransition,
      canvasBgColor, canvasDotColor, themeEdgeColor, appSettings.theme]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenu]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReady,   setDeleteReady]   = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openDeleteConfirm() {
    setOpenMenu(null);
    setConfirmDelete(true);
    setDeleteReady(false);
    deleteTimerRef.current = setTimeout(() => setDeleteReady(true), 250);
  }
  function cancelDelete() {
    setConfirmDelete(false);
    setDeleteReady(false);
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
  }
  function confirmDeleteFlow() {
    if (!deleteReady) return;
    setConfirmDelete(false);
    deleteFlow();
  }

  function cancelNodeDelete() {
    setConfirmNodeDelete(null);
    setNodeDeleteReady(false);
    if (nodeDeleteTimerRef.current) clearTimeout(nodeDeleteTimerRef.current);
  }
  function executeNodeDelete() {
    if (!nodeDeleteReady || !confirmNodeDelete) return;
    const ids = confirmNodeDelete.ids;
    pushHistory();
    setNodes(ns => ns.filter(n => !ids.includes(n.id)));
    setEdges(es => es.filter(e => !ids.includes(e.source) && !ids.includes(e.target)));
    setSelectedNode(null);
    setConfirmNodeDelete(null);
  }

  const [menuExportTarget, setMenuExportTarget] = useState<StoredPreset | null>(null);
  const [importWarn, setImportWarn] = useState<{ nodes: Node[]; edges: Edge[]; dangerous: string[] } | null>(null);

  function exportCurrentPreset() {
    setOpenMenu(null);
    const allNodes = getNodes(); const allEdges = getEdges();
    setMenuExportTarget({
      id: flowName, name: flowName, displayName: flowName,
      presetVersion: '', author: '', authorLink: '', description: '',
      nodes: allNodes, edges: allEdges,
      savedAt: new Date().toISOString(),
      nodeCount: allNodes.filter(n => n.type !== 'comment').length,
      dangerousTypes: detectDangerous(allNodes),
    });
  }

  async function doExportCurrentPreset(meta: PresetMeta) {
    const target = menuExportTarget;
    setMenuExportTarget(null);
    if (!target) return;
    try {
      const path = await SaveAxprojDialog(target.name);
      if (!path) return;
      const content = JSON.stringify({
        version: 1, name: target.name,
        displayName:   meta.displayName   || target.name,
        presetVersion: meta.presetVersion || '',
        author:        meta.author        || '',
        authorLink:    meta.authorLink    || '',
        description:   meta.description   || '',
        nodes: target.nodes, edges: target.edges, savedAt: target.savedAt,
      }, null, 2);
      await WriteTextFile(path, content);
    } catch { }
  }

  async function importAxprojToCanvas() {
    setOpenMenu(null);
    try {
      const path = await OpenAxprojDialog();
      if (!path) return;
      const raw = await ReadTextFile(path);
      const data = JSON.parse(raw) as { nodes?: Node[]; edges?: Edge[] };
      if (!Array.isArray(data.nodes)) return;
      const nds = data.nodes as Node[];
      const eds = (data.edges ?? []) as Edge[];
      const dangerous = detectDangerous(nds);
      if (dangerous.length > 0) {
        setImportWarn({ nodes: nds, edges: eds, dangerous });
      } else {
        pushHistory(); setNodes(nds); setEdges(eds); setSelectedNode(null);
      }
    } catch { }
  }

  const [showRunDialog, setShowRunDialog] = useState(false);
  const [disconnectWarning, setDisconnectWarning] = useState<{
    skippedCount: number; skippedLabels: string[];
  } | null>(null);

  function resetView() {
    const ns = getNodes();
    if (!ns.length) return;
    const es = getEdges();
    const comps = getConnectedComponents(ns, es);
    const largest = comps.sort((a, b) => b.length - a.length)[0];
    const target = largest ?? ns;
    const xs = target.map(n => n.position.x);
    const ys = target.map(n => n.position.y);
    const x2s = target.map(n => n.position.x + (n.measured?.width  ?? 200));
    const y2s = target.map(n => n.position.y + (n.measured?.height ?? 80));
    const cx = (Math.min(...xs) + Math.max(...x2s)) / 2;
    const cy = (Math.min(...ys) + Math.max(...y2s)) / 2;
    setCenter(cx, cy, { zoom: getViewport().zoom, duration: 350 });
  }

  function openRunFlow() {
    const comps = getConnectedComponents(nodes.filter(n => n.type !== 'comment'), edges);
    if (comps.length > 1) {
      const sorted = [...comps].sort((a, b) => b.length - a.length);
      const skipped = sorted.slice(1).flat();
      const skippedLabels = skipped.map(n => {
        const d = n.data as Record<string, unknown>;
        return (typeof d.label === 'string' && d.label) || n.type || n.id;
      });
      setDisconnectWarning({ skippedCount: skipped.length, skippedLabels });
    } else {
      setShowRunDialog(true);
    }
  }
  const [runCfg, setRunCfg]              = useState<RunConfig>(DEFAULT_RUN);
  const [liveRun, setLiveRun]            = useState<LiveRun | null>(null);
  const [showRunPanel, setShowRunPanel]  = useState(false);
  const [runError, setRunError]          = useState('');
  const [launching, setLaunching]        = useState(false);

  useEffect(() => {
    const unsub1 = EventsOn('job:progress', (ev: { jobId: string; done: number; total: number; hits: number; fails: number; avgLatency: number }) => {
      if (bulkJobIdRef.current === ev.jobId) {
        setBulkProgress(prev => prev ? { ...prev, done: ev.done, total: ev.total, hits: ev.hits, fails: ev.fails, avgLatency: ev.avgLatency, status: 'running' } : null);
      } else {
        setLiveRun(prev => prev?.jobId === ev.jobId
          ? { ...prev, done: ev.done, total: ev.total, hits: ev.hits, fails: ev.fails, avgLatency: ev.avgLatency, status: 'running' }
          : prev
        );
      }
    });
    const unsub2 = EventsOn('job:done', (snap: { jobId: string; status: string; done: number; total: number; hits: number; fails: number; avgLatency: number }) => {
      if (bulkJobIdRef.current === snap.jobId) {
        setBulkProgress(prev => prev ? { ...prev, ...snap } : null);
      } else {
        setLiveRun(prev => prev?.jobId === snap.jobId ? { ...prev, ...snap } : prev);
      }
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    if (!bulkJobId) return;
    async function fetchBulkResults() {
      const [hits, fails] = await Promise.all([
        GetResults(bulkJobId!, 'hits',  0, 5000).catch(() => []),
        GetResults(bulkJobId!, 'fails', 0, 5000).catch(() => []),
      ]);
      const combined = [...(hits || []), ...(fails || [])] as RunResult[];
      combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setBulkResults(combined);
    }
    fetchBulkResults();
    if (bulkProgress?.status !== 'running') return;
    const id = setInterval(fetchBulkResults, 2000);
    return () => clearInterval(id);
  }, [bulkJobId, bulkProgress?.status]);

  async function startRun() {
    setRunError('');
    const allNodes = getNodes();
    if (allNodes.filter(n => n.type !== 'comment').length === 0) {
      setRunError('No nodes on canvas. Add nodes to build a preset first.');
      return;
    }

    const flowGraph = JSON.stringify({ nodes: allNodes, edges: getEdges() });
    const codes = runCfg.retryOnCodes.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const hasDebugUser = runCfg.debugUser.trim() !== '';
    const debugTarget = hasDebugUser
      ? `${runCfg.debugUser}:${runCfg.debugPass}`
      : 'run';
    const cfg: Record<string, unknown> = {
      method: 'GET', headers: {}, body: '',
      concurrency:  1,
      timeoutSecs:  runCfg.timeoutSecs,
      retryCount:   0,
      retryOnCodes: codes,
      tlsProfile:   ({ chrome: 'chrome_146', firefox: 'firefox_135', safari: 'safari_16', random: 'random' } as Record<string,string>)[flowSettings.tlsProfile] ?? 'chrome_146',
      proxyMode:    runCfg.proxyMode,
      outputPath:   '.',
      outputFormat: 'jsonl',
      flowGraph,
      ...(hasDebugUser ? { seedVarMode: 'user_pass', seedVarDelim: ':' } : {}),
    };

    setLaunching(true);
    try {
      const jobId = await CreateJob(JSON.stringify(cfg), [debugTarget], runCfg.proxyList);
      await StartJob(jobId);
      setLiveRun({ jobId, done: 0, total: 1, hits: 0, fails: 0, avgLatency: 0, status: 'running' });
      setShowRunDialog(false);
      setShowRunPanel(true);
    } catch (e) {
      setRunError(String(e));
    } finally {
      setLaunching(false);
    }
  }

  async function stopRun() {
    if (!liveRun) return;
    try { await StopJob(liveRun.jobId); } catch { }
  }

  const [bulkRunError, setBulkRunError] = useState('');

  async function startBulkRun() {
    setBulkRunError('');
    const allNodes = nodes;
    if (allNodes.filter(n => n.type !== 'comment').length === 0) {
      setBulkRunError('No nodes on canvas.');
      return;
    }
    const activeDS    = datasets.find(d => d.id === bulkCfg.activeDataSetId) ?? null;
    const activeProxy = proxyPresets.find(p => p.id === bulkCfg.activeProxyPresetId) ?? null;
    const entries     = activeDS?.entries ?? [];
    const delim       = activeDS?.delimiter ?? ':';
    const useManual   = !activeDS && (bulkCfg.manualUser || bulkCfg.manualPass);
    const targets     = entries.length > 0 ? entries
                      : useManual ? [`${bulkCfg.manualUser}${delim}${bulkCfg.manualPass}`]
                      : ['run'];
    const flowGraph = JSON.stringify({ nodes: allNodes, edges });
    const codes = bulkCfg.retryOnCodes.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const cfg = {
      method: 'GET', headers: {}, body: '',
      concurrency:  bulkCfg.concurrency,
      timeoutSecs:  bulkCfg.timeoutSecs,
      retryCount:   bulkCfg.retryCount,
      retryOnCodes: codes,
      tlsProfile:   ({ chrome: 'chrome_146', firefox: 'firefox_135', safari: 'safari_16', random: 'random' } as Record<string,string>)[flowSettings.tlsProfile] ?? 'chrome_146',
      proxyMode:    activeProxy?.mode ?? 'none',
      outputPath:   '.',
      outputFormat: 'jsonl',
      flowGraph,
      seedVarMode:  (entries.length > 0 || useManual) ? 'user_pass' : '',
      seedVarDelim: delim,
    };
    try {
      const jobId = await CreateJob(JSON.stringify(cfg), targets, activeProxy?.list ?? []);
      await StartJob(jobId);
      bulkJobIdRef.current = jobId;
      setBulkJobId(jobId);
      setBulkProgress({ jobId, done: 0, total: targets.length, hits: 0, fails: 0, avgLatency: 0, status: 'running' });
      setBulkResults([]);
      setBulkSearch('');
      setBulkPage(0);
    } catch (e) {
      setBulkRunError(String(e));
    }
  }

  async function stopBulkRun() {
    if (!bulkJobId) return;
    try { await StopJob(bulkJobId); } catch { }
  }

  const isRunning = liveRun?.status === 'running';
  const pct = liveRun && liveRun.total > 0
    ? Math.min((liveRun.done / liveRun.total) * 100, 100) : 0;

  const outputBranches = useMemo(() => {
    const n = nodes.find(nd => nd.type === 'output' || nd.type === 'condition');
    if (!n) return [] as {id:string;label:string;color:string}[];
    return ((n.data as {branches?: {id:string;label:string;color:string}[]}).branches ?? [])
      .map(b => ({ id: b.id, label: b.label, color: b.color }));
  }, [nodes]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0f1117]" onContextMenu={e => e.preventDefault()}>
      <div className="flex items-center h-9 bg-[#181b23] border-b border-white/5 flex-shrink-0 select-none overflow-visible relative z-40">

        <MenuDropdown
          label="File"
          open={openMenu === 'File'}
          onToggle={e => { e.stopPropagation(); setOpenMenu(openMenu === 'File' ? null : 'File'); }}
          items={[
            { label: 'New Preset',            onClick: newFlow },
            { sep: true },
            { label: 'Rename Preset',         onClick: () => { setEditName(true); setNameVal(flowName); } },
            { sep: true },
            { label: 'Export Preset as .axproj', onClick: exportCurrentPreset },
            { label: 'Import .axproj…',       onClick: importAxprojToCanvas },
            { sep: true },
            { label: 'Clear Canvas',          onClick: clearCanvas },
            { label: 'Delete Preset',         onClick: openDeleteConfirm, danger: true },
          ]}
        />

        <MenuDropdown
          label="View"
          open={openMenu === 'View'}
          onToggle={e => { e.stopPropagation(); setOpenMenu(openMenu === 'View' ? null : 'View'); }}
          items={[
            { header: 'General' },
            { label: 'Zoom In',    onClick: zoomIn,    hint: 'Ctrl++' },
            { label: 'Zoom Out',   onClick: zoomOut,   hint: 'Ctrl+-' },
            { label: 'Reset Zoom', onClick: zoomReset, hint: 'Ctrl+0' },
            { sep: true },
            { header: 'Flow' },
            { label: 'Reset View',   onClick: resetView },
            { sep: true },
            { label: 'Palette',      checked: paletteOpen,  onClick: () => setPaletteOpen(v => { localStorage.setItem('axiom:view:palette',  String(!v)); return !v; }) },
            { label: 'Overview Map', checked: showMiniMap,  onClick: () => setAppSettings(a => ({ ...a, showMiniMap: !a.showMiniMap })) },
          ]}
        />

        <MenuDropdown
          label="Run"
          open={openMenu === 'Run'}
          onToggle={e => { e.stopPropagation(); setOpenMenu(openMenu === 'Run' ? null : 'Run'); }}
          items={[
            { label: '▶ Debug Preset', onClick: () => openRunFlow(), disabled: isRunning },
            { label: '■  Stop',     onClick: stopRun, disabled: !isRunning },
          ]}
        />

        <div className="w-px h-5 bg-white/10 mx-2 flex-shrink-0" />

        {editName ? (
          <input ref={nameRef}
            className="bg-transparent border-b border-indigo-500 text-sm text-gray-200 font-medium outline-none px-1 w-32"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditName(false); }}
            onBlur={commitRename}
          />
        ) : (
          <span
            className="text-sm font-medium text-gray-300 hover:text-white cursor-default px-1"
            onDoubleClick={() => { setEditName(true); setNameVal(flowName); }}
            title="Double-click to rename"
          >
            {flowName}
          </span>
        )}

        <select
          className="bg-transparent border-none text-xs text-gray-500 focus:outline-none cursor-pointer hover:text-gray-300 ml-0.5"
          value={flowName}
          onChange={e => { setFlowName(e.target.value); setNameVal(e.target.value); }}
        >
          {Array.from(new Set([...flowNames, flowName])).map(n => <option key={n} className="bg-[#1e2130]">{n}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2 pr-3">
          {liveRun && (
            <button onClick={() => setShowRunPanel(v => !v)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                isRunning ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-gray-500 hover:text-gray-300'
              }`}>
              {isRunning
                ? `Running ${liveRun.done} / ${liveRun.total}`
                : `Done — ${liveRun.hits} hit / ${liveRun.fails} fail`}
            </button>
          )}
          {isRunning
            ? <button onClick={stopRun}
                className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                ■ Stop
              </button>
            : <button onClick={() => openRunFlow()}
                className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors">
                ▶ Debug Run
              </button>
          }
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl px-6 py-5 w-72 text-center"
            onMouseDown={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-200 mb-1">Delete preset?</p>
            <p className="text-xs text-gray-500 mb-4">Delete "{flowName}"? This action cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={cancelDelete}
                className="px-4 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDeleteFlow} disabled={!deleteReady}
                className="px-4 py-1.5 rounded text-xs font-medium bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmNodeDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e2130] border border-white/10 rounded-xl shadow-2xl px-6 py-5 w-72 text-center"
            onMouseDown={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-gray-200 mb-1">Delete {confirmNodeDelete.label}?</p>
            <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={cancelNodeDelete}
                className="px-4 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={executeNodeDelete} disabled={!nodeDeleteReady}
                className="px-4 py-1.5 rounded text-xs font-medium bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">

        <div className="w-9 flex-shrink-0 bg-[#181b23] border-r border-white/5 flex flex-col items-center py-1 gap-px">
          {([
            { id: 'presets' as const, label: 'Pre',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><path d="M502.394,106.098L396.296,0h-15.162v121.49H130.866V0H60.27C26.987,0,0,26.987,0,60.271v391.458C0,485.013,26.987,512,60.27,512h391.459C485.014,512,512,485.013,512,451.729V129.286C512,120.591,508.542,112.256,502.394,106.098z M408.39,428.121H103.609V216.944H408.39V428.121z"/><rect x="282.012" y="0" width="68.027" height="94.015"/></svg> },
            { id: 'flow' as const, label: 'Edit',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><polygon points="268.552,183.78 214.446,129.683 160.35,183.78 214.446,237.886"/><polygon points="295.596,210.832 241.499,264.938 457.903,481.333 512,427.237"/><path d="M274.629,90.911l25.528,6.715c8.424,2.214,14.988,8.787,17.212,17.194l6.714,25.538c0.47,1.772,2.064,3.003,3.898,3.012c1.825,0,3.428-1.24,3.889-3.012l6.714-25.53c2.224-8.415,8.797-14.988,17.212-17.211l25.538-6.706c1.763-0.469,2.994-2.064,2.994-3.898c0-1.824-1.231-3.428-3.002-3.897l-25.53-6.724c-8.415-2.205-14.988-8.787-17.212-17.193L331.87,33.67c-0.461-1.781-2.064-3.003-3.889-3.003c-1.834,0-3.428,1.222-3.898,2.994l-6.714,25.538c-2.206,8.406-8.788,14.988-17.212,17.212l-25.528,6.706c-1.772,0.469-3.004,2.072-3.004,3.897C271.626,88.838,272.857,90.442,274.629,90.911z"/><path d="M228.283,359.57l-19.143-5.041c-6.307-1.656-11.232-6.582-12.888-12.88l-5.032-19.125c-0.354-1.338-1.541-2.249-2.922-2.249c-1.364,0-2.56,0.912-2.906,2.249l-5.032,19.125c-1.665,6.298-6.591,11.223-12.888,12.889l-19.134,5.032c-1.32,0.346-2.258,1.55-2.258,2.914c0,1.372,0.939,2.569,2.258,2.922l19.134,5.032c6.298,1.656,11.223,6.582,12.888,12.888l5.032,19.125c0.346,1.329,1.541,2.25,2.914,2.25c1.372,0,2.569-0.922,2.914-2.25l5.032-19.125c1.656-6.307,6.582-11.232,12.888-12.888l19.143-5.032c1.31-0.354,2.232-1.55,2.241-2.914C230.515,361.12,229.594,359.915,228.283,359.57z"/><path d="M125.422,160.696l-29.196-7.671c-9.629-2.534-17.141-10.054-19.665-19.665l-7.698-29.196c-0.514-2.029-2.338-3.429-4.438-3.429c-2.09,0-3.915,1.4-4.456,3.429l-7.68,29.196c-2.524,9.611-10.045,17.132-19.664,19.656l-29.197,7.68c-2.019,0.54-3.437,2.374-3.428,4.464c0,2.073,1.417,3.915,3.428,4.447l29.197,7.68c9.62,2.534,17.14,10.045,19.674,19.665l7.671,29.196c0.523,2.028,2.366,3.42,4.448,3.42c2.108,0,3.932-1.391,4.446-3.42l7.698-29.205c2.524-9.612,10.036-17.123,19.656-19.656l29.205-7.68c2.011-0.532,3.429-2.374,3.429-4.447C128.859,163.069,127.442,161.236,125.422,160.696z"/></svg> },
            { id: 'run' as const, label: 'Run',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><path d="M96,448L416,256L96,64V448z"/></svg> },
            { id: 'dataset' as const, label: 'Data',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><rect x="111.79" y="123.922" width="288.42" height="41.568"/><rect x="111.79" y="219.846" width="288.42" height="41.568"/><rect x="111.79" y="315.772" width="183.847" height="41.568"/><path d="M13.388,0v512h330.953l3.61-4.029L463.947,398.52l34.665-32.734V0H13.388z M463.947,365.786H376.32c-17.543,0-31.98,14.436-31.98,31.979v75.877H48.052V38.442h415.895V365.786z"/></svg> },
            { id: 'proxy' as const, label: 'Proxy',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><path d="M255.996,0C209.875,55.353,136.065,87.638,53.039,92.25c0,0,0,142.991,0,189.12C53.039,405.914,255.996,512,255.996,512s202.966-106.086,202.966-230.63c0-46.129,0-189.12,0-189.12C375.926,87.638,302.116,55.353,255.996,0z"/></svg> },
            { id: 'settings' as const, label: 'Set',
              icon: <svg viewBox="0 0 512 512" className="w-3.5 h-3.5" fill="currentColor"><path d="M502.325,307.303l-39.006-30.805c-6.215-4.908-9.665-12.429-9.668-20.348c0-0.084,0-0.168,0-0.252c-0.014-7.936,3.44-15.478,9.667-20.396l39.007-30.806c8.933-7.055,12.093-19.185,7.737-29.701l-17.134-41.366c-4.356-10.516-15.167-16.86-26.472-15.532l-49.366,5.8c-7.881,0.926-15.656-1.966-21.258-7.586c-0.059-0.06-0.118-0.119-0.177-0.178c-5.597-5.602-8.476-13.36-7.552-21.225l5.799-49.363c1.328-11.305-5.015-22.116-15.531-26.472L337.004,1.939c-10.516-4.356-22.646-1.196-29.701,7.736l-30.805,39.005c-4.908,6.215-12.43,9.665-20.349,9.668c-0.084,0-0.168,0-0.252,0c-7.935,0.014-15.477-3.44-20.395-9.667L204.697,9.675c-7.055-8.933-19.185-12.092-29.702-7.736L133.63,19.072c-10.516,4.356-16.86,15.167-15.532,26.473l5.799,49.366c0.926,7.881-1.964,15.656-7.585,21.257c-0.059,0.059-0.118,0.118-0.178,0.178c-5.602,5.598-13.36,8.477-21.226,7.552l-49.363-5.799c-11.305-1.328-22.116,5.015-26.472,15.531L1.939,174.996c-4.356,10.516-1.196,22.646,7.736,29.701l39.006,30.805c6.215,4.908,9.665,12.429,9.668,20.348c0,0.084,0,0.167,0,0.251c0.014,7.935-3.44,15.477-9.667,20.395L9.675,307.303c-8.933,7.055-12.092,19.185-7.736,29.701l17.134,41.365c4.356,10.516,15.168,16.86,26.472,15.532l49.366-5.799c7.882-0.926,15.656,1.965,21.258,7.586c0.059,0.059,0.118,0.119,0.178,0.178c5.597,5.603,8.476,13.36,7.552,21.226l-5.799,49.364c-1.328,11.305,5.015,22.116,15.532,26.472l41.366,17.134c10.516,4.356,22.646,1.196,29.701-7.736l30.804-39.005c4.908-6.215,12.43-9.665,20.348-9.669c0.084,0,0.168,0,0.251,0c7.936-0.014,15.478,3.44,20.396,9.667l30.806,39.007c7.055,8.933,19.185,12.093,29.701,7.736l41.366-17.134c10.516-4.356,16.86-15.168,15.532-26.472l-5.8-49.366c-0.926-7.881,1.965-15.656,7.586-21.257c0.059-0.059,0.119-0.119,0.178-0.178c5.602-5.597,13.36-8.476,21.225-7.552l49.364,5.799c11.305,1.328,22.117-5.015,26.472-15.531l17.134-41.365C514.418,326.488,511.258,314.358,502.325,307.303z M281.292,329.698c-39.68,16.436-85.172-2.407-101.607-42.087c-16.436-39.68,2.407-85.171,42.087-101.608c39.68-16.436,85.172,2.407,101.608,42.088C339.815,267.771,320.972,313.262,281.292,329.698z"/></svg> },
          ]).map(({ id, icon, label }) => (
            <button key={id} onClick={() => setLeftTab(id)} title={label}
              className={`relative w-full flex flex-col items-center justify-center py-3 gap-0.5 text-[8px] font-medium uppercase tracking-wider transition-colors ${
                leftTab === id
                  ? 'text-indigo-300 bg-indigo-500/10'
                  : 'text-gray-600 hover:text-gray-400 hover:bg-white/5'
              }`}>
              {leftTab === id && (
                <div className="absolute right-0 top-2 bottom-2 w-0.5 bg-indigo-500 rounded-l" />
              )}
              <div className="w-4 h-4 flex items-center justify-center">{icon}</div>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {leftTab === 'flow' && paletteOpen && (
          <div className="w-44 flex-shrink-0 bg-[#181b23] border-r border-white/5 flex flex-col overflow-y-auto">
            <div className="px-3 py-2 text-[10px] text-gray-600 uppercase tracking-wider border-b border-white/5">
              Drag to canvas
            </div>
            <div className="flex flex-col">
              {PALETTE_CATEGORIES.map(cat => {
                const collapsed = collapsedCats.has(cat.id);
                return (
                  <div key={cat.id}>
                    <button
                      onClick={() => setCollapsedCats(prev => {
                        const next = new Set(prev);
                        if (next.has(cat.id)) next.delete(cat.id); else next.add(cat.id);
                        return next;
                      })}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 hover:bg-white/5 transition-colors border-b border-white/5"
                    >
                      <span>{cat.label}</span>
                      <span className="text-gray-700">{collapsed ? '▶' : '▼'}</span>
                    </button>
                    {!collapsed && (
                      <div className="p-2 flex flex-col gap-1.5">
                        {cat.items.map(item => (
                          <PaletteItem key={item.type} {...item}
                            disabled={item.type === 'output' && nodes.some(n => n.type === 'output' || n.type === 'condition')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {leftTab === 'presets' && (
          <PresetsPanel
            currentNodes={nodes}
            currentEdges={edges}
            onLoad={(pNodes, pEdges) => { setNodes(pNodes); setEdges(pEdges); setLeftTab('flow'); }}
            flowName={flowName}
            flowNames={flowNames}
            onSelectFlow={(name) => { setFlowName(name); setNameVal(name); }}
            onNewFlow={() => { newFlow(); }}
            onDeleteFlow={deleteFlowByName}
          />
        )}

        {leftTab === 'settings' && (
          <FlowSettingsPanel
            settings={flowSettings}
            onChange={s => { setFlowSettings(s); localStorage.setItem('axiom:flowSettings', JSON.stringify(s)); }}
            appSettings={appSettings}
            onAppChange={setAppSettings}
            subTab={settingsSubTab}
            onSubTabChange={setSettingsSubTab}
            onClose={() => setLeftTab('flow')}
          />
        )}

        {leftTab === 'run' && (
          <RunTabPanel
            config={bulkCfg} onChange={setBulkCfg}
            onStart={startBulkRun} onStop={stopBulkRun} error={bulkRunError}
            progress={bulkProgress} results={bulkResults}
            search={bulkSearch} onSearch={s => { setBulkSearch(s); setBulkPage(0); }}
            page={bulkPage} onPage={setBulkPage}
            outputBranches={outputBranches}
            datasets={datasets}
            proxyPresets={proxyPresets}
            onGoToDataset={() => setLeftTab('dataset')}
            onGoToProxy={() => setLeftTab('proxy')}
          />
        )}

        {leftTab === 'dataset' && (
          <DataSetPanel
            datasets={datasets} onUpdate={setDatasets}
            activeId={bulkCfg.activeDataSetId}
            onSetActive={id => setBulkCfg(c => ({ ...c, activeDataSetId: id }))}
          />
        )}

        {leftTab === 'proxy' && (
          <ProxyPanel presets={proxyPresets} onUpdate={setProxyPresets} />
        )}

        {leftTab === 'flow' && <>
        <div className="ax-fade-up flex-1 min-w-0 flex flex-col overflow-hidden">
          <div ref={wrapper} className="relative flex-1 min-h-0" onDragOver={onDragOver} onDrop={onDrop} style={{ background: canvasBgColor }}>
            <ReactFlow
              nodes={nodes} edges={edges} nodeTypes={nodeTypes}
              onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
              onConnect={onConnect} onConnectStart={onConnectStart}
              isValidConnection={isValidConnection} onSelectionChange={onSelectionChange}
              onNodeContextMenu={onNodeContextMenu}
              onContextMenu={e => e.preventDefault()}
              onNodeDragStart={pushHistory}
              multiSelectionKeyCode={['Control', 'Shift']}
              elevateEdgesOnSelect
              fitView style={{ background: 'transparent' }}
              deleteKeyCode={null}
              minZoom={appSettings.minZoom} maxZoom={appSettings.maxZoom}
              snapToGrid={appSettings.snapToGrid} snapGrid={[appSettings.gridSize, appSettings.gridSize]}
              defaultEdgeOptions={{ type: appSettings.edgeStyle }}
            >
              <Controls />
              {showMiniMap && <MiniMap style={{ background: '#181b23', border: '1px solid rgba(255,255,255,0.05)' }} nodeColor="#4f46e5" />}
              {appSettings.backgroundStyle !== 'none' && (
                <Background
                  variant={
                    appSettings.backgroundStyle === 'dots'  ? BackgroundVariant.Dots  :
                    appSettings.backgroundStyle === 'lines' ? BackgroundVariant.Lines :
                    BackgroundVariant.Cross
                  }
                  gap={20} size={1} color={canvasDotColor} bgColor={canvasBgColor}
                />
              )}
            </ReactFlow>

            {selBox && wrapper.current && (() => {
              const r = wrapper.current.getBoundingClientRect();
              return (
                <div className="absolute pointer-events-none border border-sky-400/70 bg-sky-400/10 rounded-sm" style={{
                  left:   Math.min(selBox.sx, selBox.ex) - r.left,
                  top:    Math.min(selBox.sy, selBox.ey) - r.top,
                  width:  Math.abs(selBox.ex - selBox.sx),
                  height: Math.abs(selBox.ey - selBox.sy),
                }} />
              );
            })()}
          </div>

          {showRunPanel && liveRun && (
            <RunPanel run={liveRun} pct={pct} onClose={() => setShowRunPanel(false)} />
          )}
        </div>

        <div
          className="w-1 flex-shrink-0 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors"
          onMouseDown={onPanelDragStart}
        />
        <div className="flex-shrink-0 bg-[#181b23] border-l border-white/5 overflow-hidden flex flex-col" style={{ width: panelWidth }}>
          <div key={selectedNode?.id ?? '__none'} className="ax-slide-in flex flex-col flex-1 min-h-0 overflow-hidden">
            <NodeConfigPanel node={selectedNode} onChange={onNodeDataChange} onDelete={onNodeDelete} availableVars={buildAvailableVars(nodes, edges)} />
          </div>
        </div>
        </>}
      </div>

      {ctxMenu && (
        <div data-ctx-menu
          className="fixed z-50 bg-[#1e2130] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[170px]"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          <button onClick={() => {
              if (!ctxMenu) return;
              const pos = screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y });
              pushHistory();
              setNodes(ns => [...ns, { id: `comment-${Date.now()}`, type: 'comment', position: pos, data: { text: '', w: 200, h: 120 } }]);
              setCtxMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">
            <span className="text-amber-400">✎</span> Add Comment
          </button>
          <div className="my-1 border-t border-white/5" />
          <button onClick={() => { autoSort(); setCtxMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">
            <span className="text-indigo-400">⊞</span> Auto Sort
          </button>
          <button onClick={() => { removeIsolated(); setCtxMenu(null); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">
            <span className="text-rose-400">⊗</span> Remove Isolated
          </button>
        </div>
      )}

      {disconnectWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1e2130] border border-amber-500/40 rounded-xl shadow-2xl w-[420px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-lg">⚠</span>
              <h2 className="text-sm font-semibold text-amber-300">Disconnected nodes detected</h2>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              The preset has multiple isolated groups. Only the <span className="text-white font-semibold">largest connected group</span> will be executed.
              The following <span className="text-amber-300 font-semibold">{disconnectWarning.skippedCount} node{disconnectWarning.skippedCount !== 1 ? 's' : ''}</span> will be skipped:
            </p>
            <div className="bg-[#0d0f14] rounded-lg px-3 py-2 mb-4 max-h-32 overflow-y-auto">
              {disconnectWarning.skippedLabels.map((l, i) => (
                <div key={i} className="text-xs text-gray-500 font-mono py-0.5">— {l}</div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDisconnectWarning(null)}
                className="px-3 py-1.5 rounded text-xs text-gray-400 hover:text-gray-200 border border-white/10 hover:border-white/20 transition-colors">
                Cancel
              </button>
              <button onClick={() => { setDisconnectWarning(null); setShowRunDialog(true); }}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors">
                Run anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {showRunDialog && (
        <RunDialog
          config={runCfg}
          onChange={setRunCfg}
          onRun={startRun}
          onCancel={() => { setShowRunDialog(false); setRunError(''); }}
          error={runError}
          launching={launching}
        />
      )}

      {menuExportTarget && (
        <ExportMetaModal
          preset={menuExportTarget}
          onConfirm={doExportCurrentPreset}
          onCancel={() => setMenuExportTarget(null)}
        />
      )}

      {importWarn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181b23] border border-amber-500/40 rounded-xl shadow-2xl w-[380px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-lg">⚠</span>
              <h3 className="text-sm font-semibold text-gray-200">Security Warning</h3>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              This preset contains nodes that can access local system resources:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {importWarn.dangerous.map(t => (
                <span key={t} className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  {DANGEROUS_LABELS[t] ?? t}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mb-4">
              Only load presets from sources you trust. These nodes can read/write files, execute shell commands, and make network connections.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setImportWarn(null)}
                className="px-4 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                  pushHistory();
                  setNodes(importWarn.nodes); setEdges(importWarn.edges); setSelectedNode(null);
                  setImportWarn(null);
                }}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs text-white font-medium transition-colors">
                Load Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


const HTTP_STATUS: Record<number, string> = {
  100:'Continue', 101:'Switching Protocols', 102:'Processing', 103:'Early Hints',
  200:'OK', 201:'Created', 202:'Accepted', 203:'Non-Authoritative Info',
  204:'No Content', 205:'Reset Content', 206:'Partial Content', 207:'Multi-Status',
  208:'Already Reported', 226:'IM Used',
  300:'Multiple Choices', 301:'Moved Permanently', 302:'Found',
  303:'See Other', 304:'Not Modified', 305:'Use Proxy',
  307:'Temporary Redirect', 308:'Permanent Redirect',
  400:'Bad Request', 401:'Unauthorized', 402:'Payment Required',
  403:'Forbidden', 404:'Not Found', 405:'Method Not Allowed',
  406:'Not Acceptable', 407:'Proxy Auth Required', 408:'Request Timeout',
  409:'Conflict', 410:'Gone', 411:'Length Required', 412:'Precondition Failed',
  413:'Payload Too Large', 414:'URI Too Long', 415:'Unsupported Media Type',
  416:'Range Not Satisfiable', 417:'Expectation Failed', 418:"I'm a Teapot",
  421:'Misdirected Request', 422:'Unprocessable Entity', 423:'Locked',
  424:'Failed Dependency', 425:'Too Early', 426:'Upgrade Required',
  428:'Precondition Required', 429:'Too Many Requests',
  431:'Header Fields Too Large', 451:'Unavailable For Legal Reasons',
  500:'Internal Server Error', 501:'Not Implemented', 502:'Bad Gateway',
  503:'Service Unavailable', 504:'Gateway Timeout', 505:'Version Not Supported',
  506:'Variant Also Negotiates', 507:'Insufficient Storage', 508:'Loop Detected',
  510:'Not Extended', 511:'Network Auth Required',
};
function statusLabel(code: number): string {
  return HTTP_STATUS[code] ? `${code} (${HTTP_STATUS[code]})` : String(code);
}
function statusColor(code: number): string {
  if (code >= 500) return 'text-red-400';
  if (code >= 400) return 'text-orange-400';
  if (code >= 300) return 'text-yellow-400';
  if (code >= 200) return 'text-emerald-400';
  return 'text-gray-400';
}

function detectCodeLang(s: string): string {
  const t = s.trim();
  if (t.startsWith('{') || t.startsWith('[')) return 'json';
  if (t.startsWith('<')) return 'html';
  return 'plaintext';
}


function CodeViewerModal({ title, code, lang, onClose }: { title: string; code: string; lang: string; onClose: () => void }) {
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = codeRef.current;
    if (!el) return;
    delete el.dataset.highlighted;
    el.textContent = code;
    if (lang !== 'plaintext') {
      ensureHljs().then(hljs => { if (hljs && codeRef.current) hljs.highlightElement(codeRef.current); });
    }
  }, [code, lang]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#1c1f2e] border border-white/10 rounded-xl shadow-2xl flex flex-col"
        style={{ width: '82vw', height: '76vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
          <span className="text-sm font-semibold text-gray-200">{title}</span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-600 font-mono uppercase">{lang}</span>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg leading-none">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="m-0 p-4 text-xs leading-relaxed min-h-full bg-transparent select-text">
            <code ref={codeRef} className={`language-${lang}`} />
          </pre>
        </div>
      </div>
    </div>
  );
}

type Expander = (title: string, code: string, lang: string) => void;

function BranchBadge({ branch }: { branch: string }) {
  const isSuccess = branch === 'SUCCESS';
  const isFail    = branch === 'FAIL';
  const color = isSuccess ? '#22c55e' : isFail ? '#ef4444' : '#818cf8';
  const bg    = isSuccess ? 'bg-emerald-500/10 border-emerald-500/30'
              : isFail    ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-indigo-500/10 border-indigo-500/30';
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-[11px] font-bold tracking-wide ${bg}`}
      style={{ color }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {branch}
    </div>
  );
}

function ViewerBtn({ label, value, onExpand }: { label: string; value: string; onExpand: Expander }) {
  return (
    <button onClick={() => onExpand(label, value, detectCodeLang(value))}
      className="flex items-center gap-1.5 text-[10px] text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/50 rounded px-2 py-1 transition-colors mt-1.5">
      ↗ View {label}
    </button>
  );
}


function RunSeparator({ result }: { result: RunResult }) {
  const ts = result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : '';
  return (
    <div className="flex items-center pt-3 pb-1 select-none">
      <span className="text-[10px] text-gray-700 font-mono ml-auto">{ts}</span>
    </div>
  );
}

type VarEntry = { name: string; value: string; hidden: boolean };
type VarBand = { hidden: boolean; entries: VarEntry[] };

function groupVars(vars: VarEntry[]): VarBand[] {
  const groups: VarBand[] = [];
  for (const v of vars) {
    const last = groups[groups.length - 1];
    if (last && last.hidden === v.hidden) {
      last.entries.push(v);
    } else {
      groups.push({ hidden: v.hidden, entries: [v] });
    }
  }
  return groups;
}

function VarRow({ v, onExpand }: { v: VarEntry; onExpand: Expander }) {
  const stripe = v.hidden ? '#374151' : '#22c55e';
  const nameColor = v.hidden ? 'text-gray-600' : 'text-gray-500';
  const valColor  = v.hidden ? 'text-gray-500' : 'text-gray-200';
  return (
    <div className="flex items-start gap-0 mb-1 rounded overflow-hidden">
      <div className="w-1 self-stretch rounded-l flex-shrink-0" style={{ background: stripe }} />
      <div className="flex-1 flex gap-2 px-2 py-1 bg-white/[0.025] min-w-0">
        <span className={`font-mono w-20 flex-shrink-0 truncate text-[10px] ${nameColor}`}>{v.name}</span>
        {v.value.length > 80
          ? <ViewerBtn label={v.name} value={v.value} onExpand={onExpand} />
          : <span className={`font-mono break-all min-w-0 text-[10px] ${valColor}`}>{v.value}</span>
        }
      </div>
    </div>
  );
}

function HiddenGroup({ group, onExpand }: { group: VarBand; onExpand: Expander }) {
  const [open, setOpen] = useState(false);
  const n = group.entries.length;
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[9px] text-gray-700 hover:text-gray-500 transition-colors select-none ml-1">
        <span>{open ? '▲' : '▼'}</span>
        <span>{open ? 'Hide' : `Show Hidden (${n})`}</span>
      </button>
      {open && (
        <div className="mt-0.5">
          {group.entries.map((v, i) => <VarRow key={i} v={v} onExpand={onExpand} />)}
        </div>
      )}
    </div>
  );
}

function DataPane({ results, onExpand }: { results: RunResult[]; onExpand: Expander }) {
  if (results.length === 0) return <div className="text-[11px] text-gray-700 text-center py-8">No captured data</div>;

  const allVars: VarEntry[] = [];
  for (const r of results) {
    for (const v of r.capturedVars ?? []) {
      allVars.push({ name: v.name, value: v.value, hidden: v.hidden === true });
    }
  }

  const visibleCount = allVars.filter(v => !v.hidden).length;

  if (visibleCount === 0 && allVars.length === 0) {
    return (
      <div className="text-gray-700 italic text-[10px] py-2 pl-1">
        No variables — add nodes that output a variable to see data here
      </div>
    );
  }

  if (visibleCount === 0) {
    return (
      <div className="text-[11px]">
        <div className="text-gray-700 italic text-[10px] pb-1 pl-1">
          No captured variables — enable Capture on variable nodes to see data here
        </div>
        <HiddenGroup group={{ hidden: true, entries: allVars }} onExpand={onExpand} />

      </div>
    );
  }

  const bands = groupVars(allVars);
  return (
    <div className="text-[11px]">
      {bands.map((g, gi) =>
        g.hidden
          ? <HiddenGroup key={gi} group={g} onExpand={onExpand} />
          : g.entries.map((v, vi) => <VarRow key={`${gi}-${vi}`} v={v} onExpand={onExpand} />)
      )}
    </div>
  );
}

const NODE_ICONS: Record<string, string> = {
  http_request: 'HTTP', parse: 'PRE', regex_extract: 'RGX', html_select: 'CSS',
  xpath_select: 'XP', set_variable: 'VAR', random_data: 'RND', list_item: 'LST',
  string_op: 'STR', encode_decode: 'ENC', hash: 'HSH',
  crypto_aes: 'AES', condition: 'CND', if: 'IF', loop: 'FOR', wait: 'WT',
  websocket: 'WS', dns_lookup: 'DNS', smtp_send: 'SMTP', imap_fetch: 'IMAP',
  tcp_connect: 'TCP', ssh_execute: 'SSH', ftp_sftp: 'FTP', file_read: 'RD',
  file_write: 'WR', json_build: 'JSON', list_op: 'ARR', date_time: 'DT',
  math_op: 'MTH', try_catch: 'TRY', webhook: 'WHK', captcha_solver: 'CAP',
  js_execute: 'JS',
};

const NODE_STRIPE_COLOR: Record<string, string> = {
  http_request: '#6366f1', websocket: '#6366f1', dns_lookup: '#6366f1',
  tcp_connect: '#6366f1', ssh_execute: '#6366f1', ftp_sftp: '#6366f1',
  smtp_send: '#6366f1', imap_fetch: '#6366f1',
  set_variable: '#22c55e', random_data: '#22c55e', list_item: '#22c55e',
  json_build: '#22c55e', list_op: '#22c55e', date_time: '#22c55e', math_op: '#22c55e',
  parse: '#a855f7', regex_extract: '#a855f7', html_select: '#a855f7', xpath_select: '#a855f7',
  condition: '#f59e0b', if: '#38bdf8', loop: '#f59e0b', wait: '#f59e0b', try_catch: '#f87171',
  string_op: '#f97316', encode_decode: '#f97316', hash: '#f97316', crypto_aes: '#f97316',
  file_read: '#38bdf8', file_write: '#38bdf8',
  webhook: '#818cf8', captcha_solver: '#facc15', js_execute: '#34d399',
};

function LogStepRow({ step, onExpand }: { step: LogStep; onExpand: Expander }) {
  const [open, setOpen] = useState(true);
  const stripe = NODE_STRIPE_COLOR[step.nodeType] ?? '#6b7280';
  const icon   = NODE_ICONS[step.nodeType] ?? '?';
  const expandFields = step.fields.filter(f => f.expandable);
  const plainFields  = step.fields.filter(f => !f.expandable);
  const hasDetail = plainFields.length > 0 || expandFields.length > 0 || step.error;
  return (
    <div className="flex items-start gap-0 mb-1 rounded overflow-hidden text-[11px]">
      <div className="w-1 self-stretch rounded-l flex-shrink-0" style={{ background: stripe }} />
      <div className="flex-1 bg-white/[0.025]">
        <button onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-2 py-1 text-left hover:bg-white/[0.03] transition-colors">
          <span className="text-[9px] font-bold font-mono text-gray-600 w-9 flex-shrink-0 text-right">{icon}</span>
          <span className="text-gray-300 flex-1">
            {step.nodeLabel}
            {step.durationMs != null && <span className="text-gray-600 ml-2">{step.durationMs.toFixed(0)}ms</span>}
          </span>
          {hasDetail && <span className="text-gray-700 text-[9px]">{open ? '▲' : '▼'}</span>}
        </button>
        {open && hasDetail && (
          <div className="px-3 pb-2 space-y-0.5">
            {plainFields.map(f => {
              const isStatus = f.label === 'status';
              const code = isStatus ? parseInt(f.value) : NaN;
              const display = isStatus && !isNaN(code) ? statusLabel(code) : f.value;
              return (
                <div key={f.label} className="flex gap-2">
                  <span className="text-gray-600 font-mono w-14 flex-shrink-0 text-[10px]">{f.label}</span>
                  <span className={`font-mono break-all text-[10px] ${isStatus ? statusColor(code) : 'text-gray-300'}`}>
                    {display}
                  </span>
                </div>
              );
            })}
            {step.error && (
              <div className="flex gap-2">
                <span className="text-gray-600 font-mono w-14 flex-shrink-0 text-[10px]">error</span>
                <span className="font-mono break-all text-[10px] text-red-400">{step.error}</span>
              </div>
            )}
            {expandFields.map(f => (
              <ViewerBtn key={f.label} label={f.label} value={f.value} onExpand={onExpand} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LogPane({ results, onExpand }: { results: RunResult[]; onExpand: Expander }) {
  if (results.length === 0) return <div className="text-[11px] text-gray-700 text-center py-8">No log entries</div>;
  return (
    <div className="text-[11px]">
      {results.map((r, ri) => {
        const latMs = r.latency ? `${(r.latency / 1e6).toFixed(0)}ms` : '—';
        const steps: LogStep[] = r.logSteps ?? [
          {
            nodeType: 'http_request', nodeLabel: 'HTTP Request',
            durationMs: r.latency ? r.latency / 1e6 : undefined,
            fields: [
              { label: 'url',    value: r.target },
              { label: 'status', value: statusLabel(r.statusCode) },
              { label: 'latency',value: latMs },
              { label: 'proxy',  value: r.proxyUsed || 'direct' },
              ...(r.bodySnippet ? [{ label: 'response body', value: r.bodySnippet, expandable: true }] : []),
            ],
            error: r.error,
          },
        ];
        return (
          <div key={ri}>
            <RunSeparator result={r} />
            {steps.map((step, si) => (
              <LogStepRow key={si} step={step} onExpand={onExpand} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function RunPanel({ run, pct, onClose }: { run: LiveRun; pct: number; onClose: () => void }) {
  const isRunning = run.status === 'running';
  const [allResults, setAllResults] = useState<RunResult[]>([]);
  const [detailTab, setDetailTab]   = useState<'data' | 'log'>('data');
  const [codeViewer, setCodeViewer] = useState<{ title: string; code: string; lang: string } | null>(null);
  const [panelH, setPanelH] = useState(() => {
    const s = localStorage.getItem('axiom:runPanelH');
    return s ? Math.max(160, Math.min(800, Number(s))) : 340;
  });
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  function onDragHandleDown(e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { startY: e.clientY, startH: panelH };
    function onMove(ev: MouseEvent) {
      if (!dragRef.current) return;
      const next = Math.max(160, Math.min(800, dragRef.current.startH - (ev.clientY - dragRef.current.startY)));
      setPanelH(next);
      localStorage.setItem('axiom:runPanelH', String(next));
    }
    function onUp() { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    Promise.all([
      GetResults(run.jobId, 'hits',  0, 500).catch(() => [] as RunResult[]),
      GetResults(run.jobId, 'fails', 0, 500).catch(() => [] as RunResult[]),
    ]).then(([hits, fails]) => {
      const combined = [...(hits ?? []), ...(fails ?? [])] as RunResult[];
      combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setAllResults(combined);
    });
  }, [run.status, run.jobId]);

  const expand: Expander = (t, c, l) => setCodeViewer({ title: t, code: c, lang: l });

  const outputBranch = [...allResults].reverse().find(r => r.outputBranch)?.outputBranch;

  const HEADER_H = 40;
  const TAB_H    = 32;

  return (
    <div className="flex-shrink-0 border-t border-white/5 bg-[#181b23] flex flex-col" style={{ height: panelH }}>
      <div onMouseDown={onDragHandleDown}
        className="h-1 flex-shrink-0 cursor-ns-resize hover:bg-indigo-500/40 active:bg-indigo-500/60 transition-colors select-none" />

      <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 flex-shrink-0" style={{ height: HEADER_H }}>
        <span className="text-xs font-semibold text-gray-300">{isRunning ? 'Running…' : 'Completed'}</span>
        <span className="text-xs text-gray-600">{run.done}/{run.total}</span>
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${isRunning ? 'bg-indigo-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-emerald-400">{run.hits} success</span>
        <span className="text-xs text-red-400">{run.fails} fail</span>
        {run.avgLatency > 0 && <span className="text-xs text-gray-600">{run.avgLatency.toFixed(0)}ms</span>}
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 ml-1 text-base leading-none">✕</button>
      </div>

      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex border-b border-white/5 flex-shrink-0" style={{ height: TAB_H }}>
          {(['data', 'log'] as const).map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={`px-4 py-1.5 text-[11px] font-medium transition-colors ${detailTab === t ? 'text-indigo-300 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'data' ? 'Data' : 'Log'}
            </button>
          ))}
        </div>
        {outputBranch && (
          <div className="px-3 pt-2 pb-1 flex-shrink-0">
            <BranchBadge branch={outputBranch} />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 pt-1 select-text">
          {allResults.length === 0 && isRunning
            ? <div className="text-[11px] text-gray-700 text-center py-8">Waiting for results…</div>
            : detailTab === 'data'
              ? <DataPane results={allResults} onExpand={expand} />
              : <LogPane  results={allResults} onExpand={expand} />
          }
        </div>
      </div>

      {codeViewer && (
        <CodeViewerModal title={codeViewer.title} code={codeViewer.code} lang={codeViewer.lang} onClose={() => setCodeViewer(null)} />
      )}
    </div>
  );
}


function RunDialog({
  config, onChange, onRun, onCancel, error, launching,
}: {
  config: RunConfig;
  onChange: (c: RunConfig) => void;
  onRun: () => void;
  onCancel: () => void;
  error: string;
  launching: boolean;
}) {
  function patch(p: Partial<RunConfig>) { onChange({ ...config, ...p }); }

  const inp = 'bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 w-full focus:outline-none focus:border-indigo-500';
  const sel = 'bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 w-full focus:outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#181b23] border border-white/10 rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Run Preset</h2>
            <p className="text-xs text-gray-600 mt-0.5">Configure execution settings</p>
          </div>
          <button onClick={onCancel} className="text-gray-600 hover:text-gray-300">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <section>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Debug Variables</h3>
            <p className="text-[10px] text-gray-600 mb-2">
              Injected as <span className="font-mono text-indigo-400">{'{{User}}'}</span> and <span className="font-mono text-indigo-400">{'{{Pass}}'}</span>. Leave User empty to skip.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">User</label>
                <input className={inp} value={config.debugUser} placeholder="username"
                  onChange={e => patch({ debugUser: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Pass</label>
                <input className={inp} value={config.debugPass} placeholder="password"
                  onChange={e => patch({ debugPass: e.target.value })} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Execution</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Concurrency</label>
                <input type="number" min={1} max={2000} className={inp} value={config.concurrency}
                  onChange={e => patch({ concurrency: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Timeout (s)</label>
                <input type="number" min={1} max={300} className={inp} value={config.timeoutSecs}
                  onChange={e => patch({ timeoutSecs: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 block mb-1">Retries</label>
                <input type="number" min={0} max={10} className={inp} value={config.retryCount}
                  onChange={e => patch({ retryCount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="mt-2">
              <label className="text-[10px] text-gray-600 block mb-1">Retry on status codes</label>
              <input className={inp} value={config.retryOnCodes} placeholder="429,503"
                onChange={e => patch({ retryOnCodes: e.target.value })} />
            </div>
          </section>

          <section>
            <h3 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Proxy</h3>
            <div className="mb-2">
              <label className="text-[10px] text-gray-600 block mb-1">Mode</label>
              <select className={sel} value={config.proxyMode}
                onChange={e => patch({ proxyMode: e.target.value as RunConfig['proxyMode'] })}>
                <option value="none">None (direct)</option>
                <option value="round_robin">Round Robin</option>
                <option value="random">Random</option>
              </select>
            </div>
            {config.proxyMode !== 'none' && (
              <div className="border border-white/5 rounded-lg overflow-hidden" style={{ height: '200px' }}>
                <EditableList
                  items={config.proxyList}
                  onChange={list => patch({ proxyList: list })}
                  placeholder="No proxies added."
                  addPlaceholder="host:port or scheme://user:pass@host:port"
                />
              </div>
            )}
          </section>

          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
          <button onClick={onCancel} className="px-4 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300">
            Cancel
          </button>
          <button onClick={onRun} disabled={launching}
            className="px-5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition-colors flex items-center gap-2">
            {launching ? 'Starting…' : '▶ Start Run'}
          </button>
        </div>
      </div>
    </div>
  );
}


function parseFileEntries(raw: string, fieldDelim: string): string[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const extraSeps = [',', ';', '|'].filter(s => s !== fieldDelim);
  const pattern = new RegExp(`[\\n${extraSeps.map(s => s === '|' ? '\\|' : s).join('')}]`);
  return text.split(pattern).map(s => s.trim()).filter(Boolean);
}

const BULK_PAGE_SIZE = 50;

function resultIsHit(r: RunResult): boolean {
  if (r.error) return false;
  if (r.statusCode > 0) return r.statusCode >= 200 && r.statusCode < 300;
  return true;
}


interface VarFilter {
  name: string;
  op: 'contains' | 'equals' | 'starts_with' | 'not_empty' | 'is_empty' | 'regex';
  value: string;
}
interface BulkFilter {
  status:     string;
  statusCode: string;
  latencyMin: string;
  latencyMax: string;
  varFilters: VarFilter[];
}
const DEFAULT_BULK_FILTER: BulkFilter = {
  status: 'all', statusCode: '', latencyMin: '', latencyMax: '', varFilters: [],
};

function countActiveFilters(f: BulkFilter): number {
  let n = 0;
  if (f.status !== 'all') n++;
  if (f.statusCode) n++;
  if (f.latencyMin || f.latencyMax) n++;
  n += f.varFilters.filter(v => v.name).length;
  return n;
}

function applyBulkFilter(r: RunResult, f: BulkFilter): boolean {
  const hit = resultIsHit(r);
  if      (f.status === 'all')   { /* pass */ }
  else if (f.status === 'error') { if (!r.error) return false; }
  else if (f.status === 'hit')   { if (!hit) return false; }
  else if (f.status === 'fail')  { if (hit || !!r.error) return false; }
  else { if ((r.outputBranch ?? '') !== f.status) return false; }
  if (f.statusCode) {
    const code = parseInt(f.statusCode, 10);
    if (!isNaN(code) && r.statusCode !== code) return false;
  }
  if (f.latencyMin) {
    const minNs = parseFloat(f.latencyMin) * 1e6;
    if (r.latency < minNs) return false;
  }
  if (f.latencyMax) {
    const maxNs = parseFloat(f.latencyMax) * 1e6;
    if (r.latency > maxNs) return false;
  }
  for (const vf of f.varFilters) {
    if (!vf.name) continue;
    const cv = r.capturedVars?.find(v => v.name === vf.name);
    const val = cv?.value ?? '';
    switch (vf.op) {
      case 'not_empty': if (!val) return false; break;
      case 'is_empty':  if (val)  return false; break;
      case 'equals':    if (val !== vf.value) return false; break;
      case 'contains':  if (!val.toLowerCase().includes(vf.value.toLowerCase())) return false; break;
      case 'starts_with': if (!val.startsWith(vf.value)) return false; break;
      case 'regex': try { if (!new RegExp(vf.value).test(val)) return false; } catch { return false; } break;
    }
  }
  return true;
}


function BulkResultsPanel({ progress, results, delim, search, onSearch, page, onPage, onStop, outputBranches }: {
  progress: LiveRun; results: RunResult[]; delim: string;
  search: string; onSearch: (s: string) => void;
  page: number; onPage: (p: number) => void;
  onStop: () => void;
  outputBranches: {id: string; label: string; color: string}[];
}) {
  const [expanded,    setExpanded]    = useState<Set<number>>(new Set());
  const [filter,      setFilter]      = useState<BulkFilter>(DEFAULT_BULK_FILTER);
  const [filterOpen,  setFilterOpen]  = useState(false);

  const isRunning  = progress.status === 'running';
  const pct        = progress.total > 0 ? Math.min(100, (progress.done / progress.total) * 100) : 0;
  const activeFilters = countActiveFilters(filter);

  const inp = 'bg-[#0f1117] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-white/20';
  const chip = (active: boolean) =>
    `px-2 py-0.5 rounded text-[10px] border transition-colors ${active
      ? 'text-indigo-300 border-indigo-500/60 bg-indigo-500/10'
      : 'text-gray-600 border-white/10 hover:text-gray-400'}`;

  function patchFilter(p: Partial<BulkFilter>) { setFilter(prev => ({ ...prev, ...p })); onPage(0); }
  function patchVarFilter(i: number, p: Partial<VarFilter>) {
    setFilter(prev => {
      const vf = [...prev.varFilters];
      vf[i] = { ...vf[i], ...p };
      return { ...prev, varFilters: vf };
    });
    onPage(0);
  }
  function addVarFilter()    { setFilter(prev => ({ ...prev, varFilters: [...prev.varFilters, { name: '', op: 'contains', value: '' }] })); }
  function removeVarFilter(i: number) { setFilter(prev => { const vf = [...prev.varFilters]; vf.splice(i, 1); return { ...prev, varFilters: vf }; }); }
  function clearFilters()    { setFilter(DEFAULT_BULK_FILTER); onPage(0); }

  const q = search.toLowerCase();
  const filtered = results.filter(r => {
    if (!applyBulkFilter(r, filter)) return false;
    if (!q) return true;
    const di = r.target.indexOf(delim);
    const user = di >= 0 ? r.target.slice(0, di) : r.target;
    const pass = di >= 0 ? r.target.slice(di + delim.length) : '';
    return user.toLowerCase().includes(q) || pass.toLowerCase().includes(q)
      || r.capturedVars?.some(v => !v.hidden && (v.name.toLowerCase().includes(q) || v.value.toLowerCase().includes(q)))
      || r.error?.toLowerCase().includes(q)
      || (r.outputBranch ?? '').toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / BULK_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const pageItems  = filtered.slice(safePage * BULK_PAGE_SIZE, (safePage + 1) * BULK_PAGE_SIZE);

  function toggleExpand(idx: number) {
    setExpanded(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
  }

  const VAR_OPS: { v: VarFilter['op']; l: string }[] = [
    { v: 'contains',    l: 'contains' },
    { v: 'equals',      l: 'equals' },
    { v: 'starts_with', l: 'starts with' },
    { v: 'regex',       l: 'regex' },
    { v: 'not_empty',   l: 'not empty' },
    { v: 'is_empty',    l: 'is empty' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0d0f14] border-l border-white/5">

      <div className="flex-shrink-0 px-4 py-2 border-b border-white/5 flex items-center gap-3 bg-[#181b23]">
        <span className="text-[11px] font-semibold text-gray-300">{isRunning ? 'Running…' : 'Completed'}</span>
        <span className="text-[11px] text-gray-600">{progress.done}/{progress.total}</span>
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${isRunning ? 'bg-indigo-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] text-emerald-400">{progress.hits} hit</span>
        <span className="text-[11px] text-red-400">{progress.fails} fail</span>
        {progress.avgLatency > 0 && <span className="text-[10px] text-gray-600">{progress.avgLatency.toFixed(0)}ms</span>}
        {isRunning && (
          <button onClick={onStop} className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-[10px] transition-colors">Stop</button>
        )}
      </div>

      <div className="flex-shrink-0 px-3 py-2 border-b border-white/5 flex items-center gap-2">
        <input value={search} onChange={e => { onSearch(e.target.value); onPage(0); }}
          placeholder="Search user, pass, captured vars…"
          className={`flex-1 ${inp} placeholder-gray-600 select-text`} />
        {search && <button onClick={() => { onSearch(''); onPage(0); }} className="text-gray-600 hover:text-gray-300 text-xs px-1">✕</button>}

        <button onClick={() => setFilterOpen(o => !o)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] transition-colors ${
            filterOpen || activeFilters > 0
              ? 'text-indigo-300 border-indigo-500/60 bg-indigo-500/10'
              : 'text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20'
          }`}>
          <span>Filters</span>
          {activeFilters > 0 && (
            <span className="bg-indigo-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{activeFilters}</span>
          )}
        </button>

        <span className="text-[10px] text-gray-600 whitespace-nowrap">{filtered.length}/{results.length}</span>
        {totalPages > 1 && <>
          <button onClick={() => onPage(Math.max(0, safePage - 1))} disabled={safePage === 0}
            className="px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-default transition-colors">‹</button>
          <span className="text-[10px] text-gray-600 whitespace-nowrap">{safePage + 1}/{totalPages}</span>
          <button onClick={() => onPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}
            className="px-1.5 py-0.5 rounded border border-white/10 text-[10px] text-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:cursor-default transition-colors">›</button>
        </>}
      </div>

      {filterOpen && (
        <div className="flex-shrink-0 border-b border-white/5 bg-[#0f1117] px-4 py-3 space-y-3">
          <div className="flex items-start gap-4 flex-wrap">
            <div>
              <div className="text-[10px] text-gray-600 mb-1 uppercase tracking-wider">Status</div>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => patchFilter({ status: 'all' })} className={chip(filter.status === 'all')}>All</button>
                {outputBranches.length > 0
                  ? outputBranches.map(b => (
                      <button key={b.id} onClick={() => patchFilter({ status: b.id })}
                        className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                          filter.status === b.id
                            ? 'border-current bg-current/10'
                            : 'text-gray-600 border-white/10 hover:text-gray-400'
                        }`}
                        style={filter.status === b.id ? { color: b.color, borderColor: b.color + '99' } : {}}>
                        {b.label}
                      </button>
                    ))
                  : <>
                      <button onClick={() => patchFilter({ status: 'hit' })}  className={chip(filter.status === 'hit')}>Hit</button>
                      <button onClick={() => patchFilter({ status: 'fail' })} className={chip(filter.status === 'fail')}>Fail</button>
                    </>
                }
                <button onClick={() => patchFilter({ status: 'error' })} className={chip(filter.status === 'error')}>Error</button>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1 uppercase tracking-wider">Status Code</div>
              <input value={filter.statusCode} onChange={e => patchFilter({ statusCode: e.target.value })}
                placeholder="200" className={`w-20 ${inp} select-text`} />
            </div>
            <div>
              <div className="text-[10px] text-gray-600 mb-1 uppercase tracking-wider">Latency (ms)</div>
              <div className="flex items-center gap-1">
                <input value={filter.latencyMin} onChange={e => patchFilter({ latencyMin: e.target.value })}
                  placeholder="min" className={`w-16 ${inp} select-text`} />
                <span className="text-gray-600 text-[10px]">–</span>
                <input value={filter.latencyMax} onChange={e => patchFilter({ latencyMax: e.target.value })}
                  placeholder="max" className={`w-16 ${inp} select-text`} />
              </div>
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="self-end px-2 py-1 text-[10px] text-gray-600 hover:text-gray-300 border border-white/10 rounded transition-colors">
                Clear all
              </button>
            )}
          </div>

          <div>
            <div className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">Variable Conditions</div>
            <div className="space-y-1.5">
              {filter.varFilters.map((vf, i) => (
                <div key={i} className="flex items-center gap-1.5 flex-wrap">
                  <input value={vf.name} onChange={e => patchVarFilter(i, { name: e.target.value })}
                    placeholder="var name" className={`w-28 ${inp} select-text`} />
                  <select value={vf.op} onChange={e => patchVarFilter(i, { op: e.target.value as VarFilter['op'] })}
                    className={`${inp} pr-1`}>
                    {VAR_OPS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                  {vf.op !== 'not_empty' && vf.op !== 'is_empty' && (
                    <input value={vf.value} onChange={e => patchVarFilter(i, { value: e.target.value })}
                      placeholder="value" className={`w-40 ${inp} select-text`} />
                  )}
                  <button onClick={() => removeVarFilter(i)} className="text-gray-600 hover:text-red-400 text-xs transition-colors px-0.5">✕</button>
                </div>
              ))}
              <button onClick={addVarFilter}
                className="text-[10px] text-gray-600 hover:text-indigo-400 border border-dashed border-white/10 hover:border-indigo-500/40 rounded px-2.5 py-0.5 transition-colors">
                + Add variable condition
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto select-text">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="sticky top-0 z-10 bg-[#181b23] border-b border-white/5">
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium w-10">#</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium w-16">Status</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium w-36">User</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium w-36">Pass</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium">Captured</th>
              <th className="text-left px-3 py-1.5 text-[10px] text-gray-600 font-medium w-28">Info</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-10 text-center text-[11px] text-gray-600">
                {isRunning ? 'Waiting for results…' : (search || activeFilters > 0) ? 'No matching results' : 'No results yet'}
              </td></tr>
            )}
            {pageItems.map((r, i) => {
              const absIdx = safePage * BULK_PAGE_SIZE + i;
              const hit    = resultIsHit(r);
              const di     = r.target.indexOf(delim);
              const user   = di >= 0 ? r.target.slice(0, di) : r.target;
              const pass   = di >= 0 ? r.target.slice(di + delim.length) : '';
              const vars   = r.capturedVars?.filter(v => !v.hidden) ?? [];
              const isExp  = expanded.has(absIdx);
              const statusBadge = r.error
                ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400 border border-red-500/20">Error</span>
                : hit
                  ? <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">{r.outputBranch || 'Hit'}</span>
                  : <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-gray-500 border border-white/10">{r.outputBranch || 'Fail'}</span>;
              return (
                <React.Fragment key={absIdx}>
                  <tr onClick={() => toggleExpand(absIdx)}
                    className={`border-b border-white/[0.04] cursor-pointer transition-colors ${isExp ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-3 py-1.5 text-gray-600 tabular-nums">{absIdx + 1}</td>
                    <td className="px-3 py-1.5">{statusBadge}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-300 max-w-[144px] truncate">{user}</td>
                    <td className="px-3 py-1.5 font-mono text-gray-500 max-w-[144px] truncate">{pass}</td>
                    <td className="px-3 py-1.5 text-gray-400 max-w-[260px] truncate font-mono">
                      {vars.slice(0, 3).map(v => `${v.name}=${v.value}`).join('  ')}
                      {vars.length > 3 && <span className="text-gray-600"> +{vars.length - 3}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600 max-w-[112px] truncate">
                      {r.error ? <span className="text-red-400/70">{r.error}</span>
                        : r.statusCode > 0 ? String(r.statusCode) : null}
                    </td>
                  </tr>
                  {isExp && (
                    <tr className="bg-[#0f1117] border-b border-white/[0.04]">
                      <td />
                      <td colSpan={5} className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] mb-2">
                          {r.statusCode > 0 && <span className="text-gray-600">Status: <span className="text-gray-400">{r.statusCode}</span></span>}
                          {r.latency > 0 && <span className="text-gray-600">Latency: <span className="text-gray-400">{(r.latency / 1e6).toFixed(0)}ms</span></span>}
                          {r.proxyUsed && <span className="text-gray-600">Proxy: <span className="font-mono text-gray-400">{r.proxyUsed}</span></span>}
                          {r.error && <span className="text-gray-600">Error: <span className="text-red-400">{r.error}</span></span>}
                        </div>
                        {vars.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {vars.map(v => (
                              <span key={v.name} className="font-mono bg-white/5 rounded px-2 py-0.5 text-[10px] text-indigo-300 border border-white/5">
                                <span className="text-gray-500">{v.name}</span> = {v.value.length > 80 ? v.value.slice(0, 80) + '…' : v.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7.5V2M3.5 4.5L6 2l2.5 2.5"/><path d="M2 10.5h8"/>
    </svg>
  );
}

function RunTabPanel({ config, onChange, onStart, onStop, error, progress, results, search, onSearch, page, onPage, outputBranches = [], datasets, proxyPresets, onGoToDataset, onGoToProxy }: {
  config: BulkRunConfig;
  onChange: (c: BulkRunConfig) => void;
  onStart: () => void;
  onStop: () => void;
  error: string;
  progress: LiveRun | null;
  results: RunResult[];
  search: string;
  onSearch: (s: string) => void;
  page: number;
  onPage: (p: number) => void;
  outputBranches: {id: string; label: string; color: string}[];
  datasets: DataSet[];
  proxyPresets: ProxyPreset[];
  onGoToDataset: () => void;
  onGoToProxy: () => void;
}) {
  function patch(p: Partial<BulkRunConfig>) { onChange({ ...config, ...p }); }
  const inp = 'w-full bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-white/20';
  const [leftW, setLeftW] = useState(300);
  const dividerDragRef = useRef<{ startX: number; startW: number } | null>(null);

  function onDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dividerDragRef.current = { startX: e.clientX, startW: leftW };
    function onMove(ev: MouseEvent) {
      if (!dividerDragRef.current) return;
      setLeftW(Math.max(220, Math.min(560, dividerDragRef.current.startW + ev.clientX - dividerDragRef.current.startX)));
    }
    function onUp() { dividerDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const activeDS    = datasets.find(d => d.id === config.activeDataSetId) ?? null;
  const noDataset   = config.activeDataSetId === null;

  return (
    <div className="ax-fade-up flex-1 bg-[#0f1117] flex flex-col overflow-hidden">
      <div className="px-5 py-3 text-sm font-semibold text-gray-200 border-b border-white/5 flex-shrink-0 bg-[#181b23]">
        Bulk Run
      </div>
      <div className="flex-1 overflow-hidden flex min-h-0">

        <div className="flex-shrink-0 flex flex-col overflow-y-auto" style={{ width: leftW }}>
          <div className="p-5 flex flex-col gap-5">

            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-white/5">Dataset</div>
              <select
                value={config.activeDataSetId ?? ''}
                onChange={e => patch({ activeDataSetId: e.target.value || null })}
                className="w-full bg-[#0d0f14] border border-white/10 rounded px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-indigo-500/50 mb-2"
              >
                <option value="">None — manual input</option>
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id}>{ds.name} ({ds.entries.length} entries)</option>
                ))}
              </select>

              {noDataset && (
                <div className="flex flex-col gap-1.5 p-3 bg-white/[0.03] border border-white/5 rounded">
                  <div className="text-[10px] text-gray-600 mb-1">
                    Single run — injects as <span className="font-mono text-indigo-400/70">{'{{User}}'}</span> / <span className="font-mono text-indigo-400/70">{'{{Pass}}'}</span>
                  </div>
                  <input value={config.manualUser} onChange={e => patch({ manualUser: e.target.value })}
                    placeholder="Username" className={inp} />
                  <input type="password" value={config.manualPass} onChange={e => patch({ manualPass: e.target.value })}
                    placeholder="Password" className={inp} />
                </div>
              )}

              {activeDS && (
                <div className="text-[10px] text-gray-600 mt-1">
                  Delim: <span className="font-mono text-gray-500">{activeDS.delimiter === '\t' ? 'tab' : activeDS.delimiter}</span>
                  {' · '}{activeDS.entries.length} entries
                </div>
              )}

              <button onClick={onGoToDataset} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors mt-1.5 self-start">
                Manage datasets ▶
              </button>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-white/5">Proxy</div>
              <select
                value={config.activeProxyPresetId ?? ''}
                onChange={e => patch({ activeProxyPresetId: e.target.value || null })}
                className="w-full bg-[#0d0f14] border border-white/10 rounded px-2 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-indigo-500/50 mb-1.5"
              >
                <option value="">No proxy</option>
                {proxyPresets.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.list.length} proxies, {p.mode === 'round_robin' ? 'round robin' : 'random'})</option>
                ))}
              </select>
              <button onClick={onGoToProxy} className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors self-start">
                Manage proxies ▶
              </button>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 pb-1 border-b border-white/5">Execution</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Concurrency</label>
                  <input type="number" min={1} max={2000} className={inp} value={config.concurrency}
                    onChange={e => patch({ concurrency: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Timeout (s)</label>
                  <input type="number" min={1} max={300} className={inp} value={config.timeoutSecs}
                    onChange={e => patch({ timeoutSecs: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Retries</label>
                  <input type="number" min={0} max={10} className={inp} value={config.retryCount}
                    onChange={e => patch({ retryCount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Retry on Codes</label>
                  <input className={inp} value={config.retryOnCodes} placeholder="429,503"
                    onChange={e => patch({ retryOnCodes: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={onStart}
                className="px-5 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors">
                ▶ Start Bulk Run
              </button>
              {error && <span className="text-xs text-red-400">{error}</span>}
            </div>
          </div>
        </div>

        <div onMouseDown={onDividerMouseDown}
          className="w-1 flex-shrink-0 bg-white/5 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-colors" />

        {progress ? (
          <BulkResultsPanel
            key={progress.jobId}
            progress={progress}
            results={results}
            delim={activeDS?.delimiter ?? ':'}
            search={search}
            onSearch={onSearch}
            page={page}
            onPage={onPage}
            onStop={onStop}
            outputBranches={outputBranches}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-600 text-sm mb-1">No run yet</div>
              <div className="text-gray-700 text-xs">Configure and start a bulk run to see results here</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ListCtxMenu({ x, y, onRename, onDuplicate, onDelete, onClose }: {
  x: number; y: number;
  onRename: () => void; onDuplicate: () => void; onDelete: () => void; onClose: () => void;
}) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [onClose]);
  const btn = 'w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors';
  return (
    <div className="fixed z-[9999] bg-[#1e2130] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[130px]"
      style={{ left: x, top: y }} onMouseDown={e => e.stopPropagation()}>
      <button className={btn + ' text-gray-300'} onMouseDown={() => { onRename(); onClose(); }}>Rename</button>
      <button className={btn + ' text-gray-300'} onMouseDown={() => { onDuplicate(); onClose(); }}>Duplicate</button>
      <div className="my-1 border-t border-white/5" />
      <button className={btn + ' text-red-400'} onMouseDown={() => { onDelete(); onClose(); }}>Delete</button>
    </div>
  );
}

function DataSetPanel({ datasets, onUpdate, activeId, onSetActive }: {
  datasets: DataSet[];
  onUpdate: (d: DataSet[]) => void;
  activeId: string | null;
  onSetActive: (id: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(datasets[0]?.id ?? null);
  const selected = datasets.find(d => d.id === selectedId) ?? null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [listW, setListW] = useState(() => Number(localStorage.getItem('axiom:ds:listW') || 176));
  const listDragRef = useRef<{ startX: number; startW: number; lastW: number } | null>(null);
  function onListDividerDown(e: React.MouseEvent) {
    e.preventDefault();
    listDragRef.current = { startX: e.clientX, startW: listW, lastW: listW };
    const onMove = (ev: MouseEvent) => {
      if (!listDragRef.current) return;
      const w = Math.max(120, Math.min(320, listDragRef.current.startW + ev.clientX - listDragRef.current.startX));
      listDragRef.current.lastW = w;
      setListW(w);
    };
    const onUp = () => {
      if (listDragRef.current) localStorage.setItem('axiom:ds:listW', String(listDragRef.current.lastW));
      listDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    if (renamingId) setTimeout(() => renameRef.current?.select(), 30);
  }, [renamingId]);

  function newDataset() {
    const id = `ds-${Date.now()}`;
    const ds: DataSet = { id, name: 'New Dataset', delimiter: ':', entries: [] };
    onUpdate([...datasets, ds]);
    setSelectedId(id);
  }

  function deleteById(id: string) {
    const rest = datasets.filter(d => d.id !== id);
    onUpdate(rest);
    if (activeId === id) onSetActive(rest[0]?.id ?? null);
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null);
  }

  function duplicateById(id: string) {
    const src = datasets.find(d => d.id === id);
    if (!src) return;
    const newId = `ds-${Date.now()}`;
    const copy: DataSet = { ...src, id: newId, name: `${src.name} (copy)` };
    const idx = datasets.findIndex(d => d.id === id);
    const next = [...datasets];
    next.splice(idx + 1, 0, copy);
    onUpdate(next);
    setSelectedId(newId);
  }

  function patchSelected(patch: Partial<DataSet>) {
    if (!selectedId) return;
    onUpdate(datasets.map(d => d.id === selectedId ? { ...d, ...patch } : d));
  }

  function patchById(id: string, patch: Partial<DataSet>) {
    onUpdate(datasets.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = (ev.target?.result as string).split('\n').map(l => l.trim()).filter(Boolean);
      patchSelected({ entries: lines, name: selected?.name === 'New Dataset' ? file.name.replace(/\.[^.]+$/, '') : selected?.name });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="ax-fade-up flex-1 bg-[#0f1117] flex flex-col overflow-hidden">
      {ctxMenu && (
        <ListCtxMenu x={ctxMenu.x} y={ctxMenu.y}
          onRename={() => setRenamingId(ctxMenu.id)}
          onDuplicate={() => duplicateById(ctxMenu.id)}
          onDelete={() => deleteById(ctxMenu.id)}
          onClose={() => setCtxMenu(null)} />
      )}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#181b23] flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-200">Data Sets</span>
        <button onClick={newDataset}
          className="px-2.5 py-1 rounded text-[11px] bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition-colors">
          + New
        </button>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 overflow-y-auto" style={{ width: listW }}>
          {datasets.length === 0 && (
            <div className="p-4 text-[11px] text-gray-600 text-center leading-relaxed">
              No datasets yet.<br/>Click + New to create one.
            </div>
          )}
          {datasets.map(ds => (
            <div key={ds.id}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors cursor-pointer ${selectedId === ds.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedId(ds.id)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(ds.id); setCtxMenu({ id: ds.id, x: e.clientX, y: e.clientY }); }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeId === ds.id ? 'bg-emerald-400' : 'bg-transparent'}`} />
                {renamingId === ds.id ? (
                  <input ref={renameRef} defaultValue={ds.name}
                    className="flex-1 min-w-0 bg-transparent border-b border-indigo-500 text-[11px] text-indigo-300 outline-none px-0"
                    onBlur={e => { patchById(ds.id, { name: e.target.value || ds.name }); setRenamingId(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setRenamingId(null); } }}
                    onClick={e => e.stopPropagation()} />
                ) : (
                  <span className={`text-[11px] font-medium truncate ${selectedId === ds.id ? 'text-indigo-300' : 'text-gray-300'}`}>{ds.name}</span>
                )}
              </div>
              <div className="text-[10px] text-gray-600 mt-0.5 pl-3">{ds.entries.length} entries</div>
            </div>
          ))}
        </div>
        <div className="w-1 flex-shrink-0 bg-white/5 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-colors"
          onMouseDown={onListDividerDown} />

        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3 min-w-0">
            <div className="flex items-center gap-2">
              <input value={selected.name} onChange={e => patchSelected({ name: e.target.value })}
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[12px] text-gray-200 outline-none focus:border-indigo-500/50"
                placeholder="Dataset name" />
              <button onClick={() => onSetActive(activeId === selected.id ? null : selected.id)}
                className={`flex-shrink-0 px-2.5 py-1.5 rounded text-[11px] border transition-colors ${
                  activeId === selected.id
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
                }`}>
                {activeId === selected.id ? 'Active' : 'Set Active'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 w-20 flex-shrink-0">Delimiter</span>
              <input value={selected.delimiter === '\t' ? '\\t' : selected.delimiter}
                onChange={e => patchSelected({ delimiter: e.target.value === '\\t' ? '\t' : e.target.value })}
                maxLength={4}
                className="w-14 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12px] text-gray-200 outline-none focus:border-indigo-500/50 font-mono text-center" />
              <div className="flex gap-1">
                {([[':', ':'], ['\t', 'tab'], [',', ','], [';', ';']] as [string,string][]).map(([v,l]) => (
                  <button key={l} onClick={() => patchSelected({ delimiter: v })}
                    className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                      selected.delimiter === v ? 'text-indigo-300 border-indigo-500/60 bg-indigo-500/10' : 'text-gray-600 border-white/10 hover:text-gray-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">{selected.entries.length} entries</span>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border border-white/10 text-gray-500 hover:text-gray-200 hover:border-white/20 transition-colors">
                <UploadIcon /> Load .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt,.csv,.tsv" className="hidden" onChange={handleFileLoad} />
            </div>

            <div className="flex-1 min-h-0 border border-white/5 rounded overflow-hidden">
              <EditableList items={selected.entries} onChange={entries => patchSelected({ entries })}
                placeholder="No entries. Add manually or load a file." addPlaceholder={`user${selected.delimiter === '\t' ? ':' : selected.delimiter}pass`} />
            </div>

            <button onClick={() => deleteById(selected.id)} className="text-[11px] text-red-500/50 hover:text-red-400 transition-colors self-start">
              Delete this dataset
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[11px] text-gray-600">
            Select a dataset to edit
          </div>
        )}
      </div>
    </div>
  );
}

function ProxyPanel({ presets, onUpdate }: { presets: ProxyPreset[]; onUpdate: (p: ProxyPreset[]) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(presets[0]?.id ?? null);
  const selected = presets.find(p => p.id === selectedId) ?? null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const renameRef = useRef<HTMLInputElement>(null);
  const [listW, setListW] = useState(() => Number(localStorage.getItem('axiom:px:listW') || 176));
  const listDragRef = useRef<{ startX: number; startW: number; lastW: number } | null>(null);
  function onListDividerDown(e: React.MouseEvent) {
    e.preventDefault();
    listDragRef.current = { startX: e.clientX, startW: listW, lastW: listW };
    const onMove = (ev: MouseEvent) => {
      if (!listDragRef.current) return;
      const w = Math.max(120, Math.min(320, listDragRef.current.startW + ev.clientX - listDragRef.current.startX));
      listDragRef.current.lastW = w;
      setListW(w);
    };
    const onUp = () => {
      if (listDragRef.current) localStorage.setItem('axiom:px:listW', String(listDragRef.current.lastW));
      listDragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  useEffect(() => {
    if (renamingId) setTimeout(() => renameRef.current?.select(), 30);
  }, [renamingId]);

  function newPreset() {
    const id = `px-${Date.now()}`;
    const p: ProxyPreset = { id, name: 'New Preset', mode: 'round_robin', list: [] };
    onUpdate([...presets, p]);
    setSelectedId(id);
  }

  function deleteById(id: string) {
    const rest = presets.filter(p => p.id !== id);
    onUpdate(rest);
    if (selectedId === id) setSelectedId(rest[0]?.id ?? null);
  }

  function duplicateById(id: string) {
    const src = presets.find(p => p.id === id);
    if (!src) return;
    const newId = `px-${Date.now()}`;
    const copy: ProxyPreset = { ...src, id: newId, name: `${src.name} (copy)` };
    const idx = presets.findIndex(p => p.id === id);
    const next = [...presets];
    next.splice(idx + 1, 0, copy);
    onUpdate(next);
    setSelectedId(newId);
  }

  function patchSelected(patch: Partial<ProxyPreset>) {
    if (!selectedId) return;
    onUpdate(presets.map(p => p.id === selectedId ? { ...p, ...patch } : p));
  }

  function patchById(id: string, patch: Partial<ProxyPreset>) {
    onUpdate(presets.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = (ev.target?.result as string).split('\n').map(l => l.trim()).filter(Boolean);
      patchSelected({ list: lines, name: selected?.name === 'New Preset' ? file.name.replace(/\.[^.]+$/, '') : selected?.name });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="ax-fade-up flex-1 bg-[#0f1117] flex flex-col overflow-hidden">
      {ctxMenu && (
        <ListCtxMenu x={ctxMenu.x} y={ctxMenu.y}
          onRename={() => setRenamingId(ctxMenu.id)}
          onDuplicate={() => duplicateById(ctxMenu.id)}
          onDelete={() => deleteById(ctxMenu.id)}
          onClose={() => setCtxMenu(null)} />
      )}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 bg-[#181b23] flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-200">Proxy</span>
        <button onClick={newPreset}
          className="px-2.5 py-1 rounded text-[11px] bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 transition-colors">
          + New
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-shrink-0 overflow-y-auto" style={{ width: listW }}>
          {presets.length === 0 && (
            <div className="p-4 text-[11px] text-gray-600 text-center leading-relaxed">
              No presets yet.<br/>Click + New to create one.
            </div>
          )}
          {presets.map(p => (
            <div key={p.id}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors cursor-pointer ${selectedId === p.id ? 'bg-indigo-500/10' : 'hover:bg-white/5'}`}
              onClick={() => setSelectedId(p.id)}
              onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setSelectedId(p.id); setCtxMenu({ id: p.id, x: e.clientX, y: e.clientY }); }}>
              {renamingId === p.id ? (
                <input ref={renameRef} defaultValue={p.name}
                  className="w-full bg-transparent border-b border-indigo-500 text-[11px] text-indigo-300 outline-none px-0"
                  onBlur={e => { patchById(p.id, { name: e.target.value || p.name }); setRenamingId(null); }}
                  onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenamingId(null); }}
                  onClick={e => e.stopPropagation()} />
              ) : (
                <div className={`text-[11px] font-medium truncate ${selectedId === p.id ? 'text-indigo-300' : 'text-gray-300'}`}>{p.name}</div>
              )}
              <div className="text-[10px] text-gray-600 mt-0.5">{p.list.length} proxies · {p.mode === 'round_robin' ? 'RR' : 'Rnd'}</div>
            </div>
          ))}
        </div>
        <div className="w-1 flex-shrink-0 bg-white/5 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-colors"
          onMouseDown={onListDividerDown} />

        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3 min-w-0">
            <input value={selected.name} onChange={e => patchSelected({ name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded px-2.5 py-1.5 text-[12px] text-gray-200 outline-none focus:border-indigo-500/50"
              placeholder="Preset name" />

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 w-14 flex-shrink-0">Rotation</span>
              <div className="flex gap-1">
                {(['round_robin', 'random'] as const).map(m => (
                  <button key={m} onClick={() => patchSelected({ mode: m })}
                    className={`px-2.5 py-1 rounded text-[10px] border transition-colors ${
                      selected.mode === m ? 'text-indigo-300 border-indigo-500/60 bg-indigo-500/10' : 'text-gray-600 border-white/10 hover:text-gray-400'
                    }`}>
                    {m === 'round_robin' ? 'Round Robin' : 'Random'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-500">{selected.list.length} proxies</span>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border border-white/10 text-gray-500 hover:text-gray-200 hover:border-white/20 transition-colors">
                <UploadIcon /> Load .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileLoad} />
            </div>

            <div className="flex-1 min-h-0 border border-white/5 rounded overflow-hidden">
              <EditableList items={selected.list} onChange={list => patchSelected({ list })}
                placeholder="No proxies. Add manually or load a file."
                addPlaceholder="http://user:pass@host:port" />
            </div>

            <button onClick={() => deleteById(selected.id)} className="text-[11px] text-red-500/50 hover:text-red-400 transition-colors self-start">
              Delete this preset
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[11px] text-gray-600">
            Select a preset to edit
          </div>
        )}
      </div>
    </div>
  );
}

function FSField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function AppearancePreview({ a }: { a: AppSettings }) {
  const canvasBg = 'var(--ax-canvas-bg, #0f1117)';

  const svgW = 230, svgH = 240;
  const dispW = Math.round(svgW * 1.75), dispH = Math.round(svgH * 1.75);
  const nW = 140, nH = 44;
  const n1x = 8,              n1y = 16;
  const n2x = svgW - nW - 8,  n2y = svgH - nH - 16;

  const hw  = a.handleShape === 'circle' ? a.handleHeight : a.handleWidth;
  const hh  = a.handleHeight;
  const hRx = a.handleShape === 'pill' ? hh / 2 : a.handleShape === 'circle' ? hh / 2 : 2;

  const srcX = n1x + nW / 2, srcY = n1y + nH + hh / 2;
  const tgtX = n2x + nW / 2, tgtY = n2y - hh / 2;
  const midX = (srcX + tgtX) / 2;
  const midY = (srcY + tgtY) / 2;

  let edgePath: string;
  if (a.edgeStyle === 'straight') {
    edgePath = `M ${srcX} ${srcY} L ${tgtX} ${tgtY}`;
  } else if (a.edgeStyle === 'step') {
    edgePath = `M ${srcX} ${srcY} L ${srcX} ${midY} L ${tgtX} ${midY} L ${tgtX} ${tgtY}`;
  } else if (a.edgeStyle === 'smoothstep') {
    const r = Math.min(14, Math.abs(tgtX - srcX) / 3, Math.abs(tgtY - srcY) / 3);
    edgePath = `M ${srcX} ${srcY} L ${srcX} ${midY - r} Q ${srcX} ${midY} ${srcX + r} ${midY} L ${tgtX - r} ${midY} Q ${tgtX} ${midY} ${tgtX} ${midY + r} L ${tgtX} ${tgtY}`;
  } else {
    edgePath = `M ${srcX} ${srcY} C ${srcX} ${midY} ${tgtX} ${midY} ${tgtX} ${tgtY}`;
  }

  const nodeBase     = '#1e2130';
  const handleColor  = '#6b7280';
  const edgeColor    = (THEMES[a.theme] ?? THEMES.void).edge;
  const textMuted    = '#374151';
  const textValue    = '#6b7280';
  const font         = 'Inter, system-ui, sans-serif';

  const req_border  = 'rgba(99,102,241,0.6)';
  const req_dot     = '#818cf8';
  const req_title   = '#a5b4fc';
  const parse_border = 'rgba(168,85,247,0.6)';
  const parse_dot    = '#c084fc';
  const parse_title  = '#d8b4fe';

  const hasDots = a.backgroundStyle === 'dots';
  const hasLines = a.backgroundStyle === 'lines';
  const hasCross = a.backgroundStyle === 'cross';

  return (
    <div className="flex flex-col gap-2 sticky top-0">
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Preview</div>
      <div className="rounded-lg overflow-hidden border border-white/5 select-none" style={{ background: canvasBg }}>
        <svg width={dispW} height={dispH} viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
          <defs>
            {hasDots && (
              <pattern id="prev-dots" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" style={{ fill: 'var(--ax-canvas-dot, #1e2130)' }} />
              </pattern>
            )}
            {hasLines && (
              <pattern id="prev-lines" x="0" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="20" y2="0" style={{ stroke: 'var(--ax-canvas-dot, #1e2130)' }} strokeWidth="0.5" />
              </pattern>
            )}
            {hasCross && (
              <pattern id="prev-cross" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="20" y2="0" style={{ stroke: 'var(--ax-canvas-dot, #1e2130)' }} strokeWidth="0.5" />
                <line x1="0" y1="0" x2="0" y2="20" style={{ stroke: 'var(--ax-canvas-dot, #1e2130)' }} strokeWidth="0.5" />
              </pattern>
            )}
          </defs>

          {hasDots  && <rect width={svgW} height={svgH} fill="url(#prev-dots)"  />}
          {hasLines && <rect width={svgW} height={svgH} fill="url(#prev-lines)" />}
          {hasCross && <rect width={svgW} height={svgH} fill="url(#prev-cross)" />}

          <path d={edgePath} fill="none" stroke={edgeColor} strokeWidth={a.edgeThickness} strokeLinecap="round"
                strokeDasharray={a.animEdgeFlow ? '5' : undefined}>
            {a.animEdgeFlow && (
              <animate attributeName="stroke-dashoffset" from="0" to="-10"
                dur="0.5s" repeatCount="indefinite" />
            )}
          </path>

          {(a.edgeStyle === 'step' || a.edgeStyle === 'smoothstep') && (
            <circle cx={midX} cy={midY} r={2} fill={edgeColor} opacity={0.4} />
          )}

          <rect x={n1x} y={n1y} width={nW} height={nH} rx={8} fill={nodeBase} stroke={req_border} strokeWidth={1.5} />
          <circle cx={n1x + 12} cy={n1y + nH / 2} r={4} fill={req_dot} />
          <text x={n1x + 24} y={n1y + nH / 2 - 4}  fill={req_title} fontSize={10} fontFamily={font} fontWeight="600">HTTP Request</text>
          <text x={n1x + 24} y={n1y + nH / 2 + 9}>
            <tspan fill={textMuted} fontSize={8.5} fontFamily={font}>method </tspan>
            <tspan fill={textValue} fontSize={8.5} fontFamily={font}>GET</tspan>
          </text>
          <rect x={srcX - hw / 2} y={n1y + nH - hh / 2} width={hw} height={hh} rx={hRx}
                fill={handleColor} />

          <rect x={n2x} y={n2y} width={nW} height={nH} rx={8} fill={nodeBase} stroke={parse_border} strokeWidth={1.5} />
          <circle cx={n2x + 12} cy={n2y + nH / 2} r={4} fill={parse_dot} />
          <text x={n2x + 24} y={n2y + nH / 2 - 4}  fill={parse_title} fontSize={10} fontFamily={font} fontWeight="600">Parse</text>
          <text x={n2x + 24} y={n2y + nH / 2 + 9}>
            <tspan fill={textMuted} fontSize={8.5} fontFamily={font}>type </tspan>
            <tspan fill={textValue} fontSize={8.5} fontFamily={font}>json</tspan>
          </text>
          <rect x={tgtX - hw / 2} y={n2y - hh / 2} width={hw} height={hh} rx={hRx}
                fill={handleColor} />
        </svg>
      </div>
    </div>
  );
}

function FlowSettingsPanel({ settings, onChange, appSettings, onAppChange, subTab, onSubTabChange, onClose }: {
  settings: FlowSettings;
  onChange: (s: FlowSettings) => void;
  appSettings: AppSettings;
  onAppChange: (a: AppSettings) => void;
  subTab: 'preset' | 'app';
  onSubTabChange: (t: 'preset' | 'app') => void;
  onClose: () => void;
}) {
  function patch(p: Partial<FlowSettings>) { onChange({ ...settings, ...p }); }
  function patchApp(p: Partial<AppSettings>) { onAppChange({ ...appSettings, ...p }); }
  const setSubTab = onSubTabChange;
  const fi = 'w-full bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-white/20';
  const uaBrowser = UA_PRESETS[settings.uaBrowser] ?? UA_PRESETS['chrome'];
  const uaVersions = uaBrowser.versions;
  const uaVersion  = uaVersions.includes(settings.uaVersion) ? settings.uaVersion : uaVersions[0];
  const uaEntries  = uaBrowser.platforms[uaVersion] ?? [];

  const Sec = ({ title }: { title: string }) => (
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2 pb-1 border-b border-white/5 first:mt-0">
      {title}
    </div>
  );
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-2.5">
      <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
  const ToggleRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider w-28 flex-shrink-0">{label}</span>
      {children}
    </div>
  );
  const Chips = ({ options, value, onChange: onChg, accent = 'indigo' }: {
    options: { v: string; l: string }[];
    value: string;
    onChange: (v: string) => void;
    accent?: string;
  }) => {
    const active = `text-${accent}-300 border-${accent}-500/60 bg-white/5`;
    return (
      <div className="flex gap-1 flex-wrap">
        {options.map(o => (
          <button key={o.v} onClick={() => onChg(o.v)}
            className={`px-2.5 py-0.5 rounded text-[10px] border transition-colors ${value === o.v ? active : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
            {o.l}
          </button>
        ))}
      </div>
    );
  };

  const subTabBtn = (id: 'preset' | 'app', label: string) => (
    <button onClick={() => setSubTab(id)}
      className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
        subTab === id ? 'bg-white/10 text-gray-200' : 'text-gray-500 hover:text-gray-300'
      }`}>
      {label}
    </button>
  );

  return (
    <div className="ax-fade-up flex-1 bg-[#0f1117] flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 flex-shrink-0 bg-[#181b23]">
        <div className="flex items-center gap-1 bg-white/5 rounded p-0.5">
          {subTabBtn('preset', 'Preset Settings')}
          {subTabBtn('app', 'App Settings')}
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-sm leading-none" title="Back">✕</button>
      </div>

      {subTab === 'app' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-10">
          <div className="grid grid-cols-2 gap-x-10 gap-y-0 flex-1 min-w-0">

            <div>
              <Sec title="Canvas Viewport" />
              <Row label="Min Zoom">
                <div className="flex items-center gap-2">
                  <input type="number" min={0.05} max={1} step={0.05} className={fi + ' w-20'}
                    value={appSettings.minZoom}
                    onChange={e => patchApp({ minZoom: Math.max(0.05, Math.min(1, Number(e.target.value))) })} />
                  <span className="text-[10px] text-gray-600">{Math.round(appSettings.minZoom * 100)}%</span>
                </div>
              </Row>
              <Row label="Max Zoom">
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={10} step={0.5} className={fi + ' w-20'}
                    value={appSettings.maxZoom}
                    onChange={e => patchApp({ maxZoom: Math.max(1, Math.min(10, Number(e.target.value))) })} />
                  <span className="text-[10px] text-gray-600">{Math.round(appSettings.maxZoom * 100)}%</span>
                </div>
              </Row>
              <ToggleRow label="Snap to Grid">
                <input type="checkbox" checked={appSettings.snapToGrid} className="accent-indigo-500"
                  onChange={e => patchApp({ snapToGrid: e.target.checked })} />
                {appSettings.snapToGrid && (
                  <input type="number" min={5} max={100} step={5} className={fi + ' w-16 ml-1'}
                    value={appSettings.gridSize}
                    onChange={e => patchApp({ gridSize: Number(e.target.value) })} />
                )}
                {appSettings.snapToGrid && <span className="text-[10px] text-gray-600">px</span>}
              </ToggleRow>
              <Row label="Background">
                <Chips
                  options={[{v:'dots',l:'Dots'},{v:'lines',l:'Lines'},{v:'cross',l:'Cross'},{v:'none',l:'None'}]}
                  value={appSettings.backgroundStyle}
                  onChange={v => patchApp({ backgroundStyle: v as AppSettings['backgroundStyle'] })}
                />
              </Row>
              <ToggleRow label="Mini Map">
                <input type="checkbox" checked={appSettings.showMiniMap} className="accent-indigo-500"
                  onChange={e => patchApp({ showMiniMap: e.target.checked })} />
                <span className="text-xs text-gray-400">Show overview map</span>
              </ToggleRow>

              <Sec title="Animations" />
              <ToggleRow label="Reduce Motion">
                <input type="checkbox" checked={appSettings.reduceMotion} className="accent-amber-500"
                  onChange={e => patchApp({ reduceMotion: e.target.checked })} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">Kill all animations</span>
              </ToggleRow>
              <ToggleRow label="Node Entrance">
                <input type="checkbox" checked={appSettings.animNodeEntrance} disabled={appSettings.reduceMotion}
                  className="accent-emerald-500" onChange={e => patchApp({ animNodeEntrance: e.target.checked })} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">Fade in on add</span>
              </ToggleRow>
              <ToggleRow label="Edge Flow">
                <input type="checkbox" checked={appSettings.animEdgeFlow} disabled={appSettings.reduceMotion}
                  className="accent-emerald-500" onChange={e => patchApp({ animEdgeFlow: e.target.checked })} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">Animated edge dashes</span>
              </ToggleRow>
              <ToggleRow label="Context Menu">
                <input type="checkbox" checked={appSettings.animContextMenu} disabled={appSettings.reduceMotion}
                  className="accent-emerald-500" onChange={e => patchApp({ animContextMenu: e.target.checked })} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">Fade + scale in</span>
              </ToggleRow>
              <ToggleRow label="Panel Slide">
                <input type="checkbox" checked={appSettings.animPanelTransition} disabled={appSettings.reduceMotion}
                  className="accent-emerald-500" onChange={e => patchApp({ animPanelTransition: e.target.checked })} />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">Tab / panel transitions</span>
              </ToggleRow>

              <Sec title="Behavior" />
              <ToggleRow label="Confirm Delete">
                <input type="checkbox" checked={appSettings.confirmOnDelete} className="accent-red-500"
                  onChange={e => patchApp({ confirmOnDelete: e.target.checked })} />
                <span className="text-xs text-gray-400">Ask before deleting nodes</span>
              </ToggleRow>
              <Row label="Undo History">
                <div className="flex items-center gap-2">
                  <input type="number" min={10} max={500} step={10} className={fi + ' w-20'}
                    value={appSettings.undoLimit}
                    onChange={e => patchApp({ undoLimit: Number(e.target.value) })} />
                  <span className="text-[10px] text-gray-600">steps</span>
                </div>
              </Row>
              <Row label="Auto Save">
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={3600} step={30} className={fi + ' w-20'}
                    value={appSettings.autoSaveSecs}
                    onChange={e => patchApp({ autoSaveSecs: Number(e.target.value) })} />
                  <span className="text-[10px] text-gray-600">{appSettings.autoSaveSecs === 0 ? 'off' : 'sec interval'}</span>
                </div>
              </Row>
            </div>

            <div>
                <Sec title="Appearance" />
                <Row label="Theme">
                  {(['vivid', 'pastel', 'neutral'] as const).map(group => (
                    <div key={group} className="mb-2">
                      <div className="text-[9px] text-gray-700 uppercase tracking-widest mb-1">{group}</div>
                      <div className="flex flex-wrap gap-1 max-w-[300px]">
                        {Object.entries(THEMES).filter(([,t]) => t.group === group).map(([key, t]) => {
                          const active = appSettings.theme === key;
                          return (
                            <button key={key} onClick={() => patchApp({ theme: key })}
                              title={t.label}
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                                active ? 'border-white/25 bg-white/8 text-gray-200' : 'border-white/8 text-gray-600 hover:text-gray-400'
                              }`}>
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.edge }} />
                              {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </Row>
                <Row label="Canvas Shade">
                  <div className="flex items-center gap-2">
                    <input type="range" min={-30} max={20} step={2} className="w-24 accent-indigo-500 cursor-pointer"
                      value={appSettings.canvasBrightness}
                      onChange={e => patchApp({ canvasBrightness: Number(e.target.value) })} />
                    <span className="text-[10px] text-gray-400 font-mono w-10">
                      {appSettings.canvasBrightness > 0 ? `+${appSettings.canvasBrightness}` : appSettings.canvasBrightness}
                    </span>
                    <button onClick={() => patchApp({ canvasBrightness: 0 })}
                      className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">reset</button>
                  </div>
                </Row>
                <Row label="Edge Style">
                  <Chips
                    options={[{v:'default',l:'Bezier'},{v:'straight',l:'Straight'},{v:'step',l:'Step'},{v:'smoothstep',l:'Smooth'}]}
                    value={appSettings.edgeStyle}
                    onChange={v => patchApp({ edgeStyle: v as AppSettings['edgeStyle'] })}
                  />
                </Row>
                <Row label="Edge Thickness">
                  <div className="flex items-center gap-2">
                    <input type="range" min={1} max={8} step={0.5} className="w-24 accent-indigo-500 cursor-pointer"
                      value={appSettings.edgeThickness}
                      onChange={e => patchApp({ edgeThickness: Number(e.target.value) })} />
                    <span className="text-[10px] text-gray-400 font-mono w-8">{appSettings.edgeThickness}px</span>
                    <button onClick={() => patchApp({ edgeThickness: 4 })}
                      className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">reset</button>
                  </div>
                </Row>
                <Row label="Handle Shape">
                  <Chips
                    options={[{v:'pill',l:'Pill'},{v:'circle',l:'Circle'},{v:'square',l:'Square'}]}
                    value={appSettings.handleShape}
                    onChange={v => patchApp({ handleShape: v as AppSettings['handleShape'] })}
                    accent="sky"
                  />
                </Row>
                {appSettings.handleShape !== 'circle' && (
                  <Row label="Handle Width">
                    <div className="flex items-center gap-2">
                      <input type="range" min={8} max={40} step={0.5} className="w-24 accent-sky-500 cursor-pointer"
                        value={appSettings.handleWidth}
                        onChange={e => patchApp({ handleWidth: Number(e.target.value) })} />
                      <span className="text-[10px] text-gray-400 font-mono w-10">{appSettings.handleWidth}px</span>
                      <button onClick={() => patchApp({ handleWidth: 22 })}
                        className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">reset</button>
                    </div>
                  </Row>
                )}
                <Row label="Handle Height">
                  <div className="flex items-center gap-2">
                    <input type="range" min={4} max={15} step={0.5} className="w-24 accent-sky-500 cursor-pointer"
                      value={appSettings.handleHeight}
                      onChange={e => patchApp({ handleHeight: Number(e.target.value) })} />
                    <span className="text-[10px] text-gray-400 font-mono w-10">{appSettings.handleHeight}px</span>
                    <button onClick={() => patchApp({ handleHeight: 9 })}
                      className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">reset</button>
                  </div>
                </Row>
                <ToggleRow label="Node Type Label">
                  <input type="checkbox" checked={appSettings.showNodeTypeLabel} className="accent-indigo-500"
                    onChange={e => patchApp({ showNodeTypeLabel: e.target.checked })} />
                  <span className="text-[11px] text-gray-400 whitespace-nowrap">Show type tag</span>
                </ToggleRow>
            </div>

          </div>{/* closes grid */}

          <div className="flex-shrink-0 self-start sticky top-0 pt-5 pl-10 border-l border-white/5">
            <AppearancePreview a={appSettings} />
          </div>

          </div>{/* closes flex gap-10 */}
        </div>
      )}

      {subTab === 'preset' && <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-x-10 gap-y-0 w-full">

          <div>
            <Sec title="General" />
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <Row label="Concurrency">
                <input type="number" className={fi} min={1} max={2000} value={settings.concurrency}
                  onChange={e => patch({ concurrency: Number(e.target.value) })} />
              </Row>
              <Row label="Timeout (ms)">
                <input type="number" className={fi} min={500} step={500} value={settings.timeoutMs}
                  onChange={e => patch({ timeoutMs: Number(e.target.value) })} />
              </Row>
              <Row label="Retries">
                <input type="number" className={fi} min={0} max={10} value={settings.retryCount}
                  onChange={e => patch({ retryCount: Number(e.target.value) })} />
              </Row>
              <Row label="Retry Codes">
                <input className={fi} value={settings.retryOnCodes} placeholder="500,502,503"
                  onChange={e => patch({ retryOnCodes: e.target.value })} />
              </Row>
            </div>
            <Row label="Follow Redirects">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.followRedirects} className="accent-indigo-500"
                  onChange={e => patch({ followRedirects: e.target.checked })} />
                <span className="text-xs text-gray-400">Enabled</span>
                {settings.followRedirects && (
                  <input type="number" className={`${fi} w-16 ml-1`} min={1} max={30} value={settings.maxRedirects}
                    onChange={e => patch({ maxRedirects: Number(e.target.value) })} />
                )}
              </label>
            </Row>

            <Sec title="TLS Profile" />
            <Row label="Browser Profile">
              <Chips
                options={[{v:'chrome',l:'Chrome'},{v:'firefox',l:'Firefox'},{v:'safari',l:'Safari'},{v:'random',l:'Random'}]}
                value={settings.tlsProfile} onChange={v => patch({ tlsProfile: v as FlowSettings['tlsProfile'] })}
              />
            </Row>

            <Sec title="User Agent" />
            <Row label="Mode">
              <Chips
                options={[{v:'preset',l:'Preset'},{v:'custom',l:'Custom'},{v:'none',l:'None'}]}
                value={settings.uaMode} onChange={v => patch({ uaMode: v as FlowSettings['uaMode'] })} accent="sky"
              />
            </Row>
            {settings.uaMode === 'preset' && <>
              <Row label="Browser">
                <div className="grid grid-cols-4 gap-1">
                  {Object.keys(UA_PRESETS).map(b => (
                    <button key={b} onClick={() => {
                      const fv = UA_PRESETS[b].versions[0];
                      const fp = UA_PRESETS[b].platforms[fv]?.[0]?.label ?? '';
                      patch({ uaBrowser: b, uaVersion: fv, uaPlatform: fp });
                    }}
                      className={`py-0.5 rounded text-[10px] border transition-colors ${settings.uaBrowser === b ? 'text-sky-300 border-sky-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
                      {BROWSER_LABELS[b]}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Version">
                <div className="flex flex-wrap gap-1">
                  {uaVersions.map(v => (
                    <button key={v} onClick={() => { const fp = uaBrowser.platforms[v]?.[0]?.label ?? ''; patch({ uaVersion: v, uaPlatform: fp }); }}
                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${uaVersion === v ? 'text-sky-300 border-sky-500/60 bg-white/5' : 'text-gray-600 border-white/10 hover:text-gray-400'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Platform">
                <select className={fi} value={settings.uaPlatform} onChange={e => patch({ uaPlatform: e.target.value })}>
                  {uaEntries.map(e => <option key={e.label} value={e.label}>{e.label}</option>)}
                </select>
              </Row>
            </>}
            {settings.uaMode === 'custom' && (
              <Row label="UA String">
                <textarea className={`${fi} resize-none`} rows={3} value={settings.uaCustom}
                  placeholder="Mozilla/5.0 (…)" onChange={e => patch({ uaCustom: e.target.value })} />
              </Row>
            )}

            <Sec title="Cookie Session" />
            <ToggleRow label="Persist Cookies">
              <input type="checkbox" checked={settings.cookieSession} className="accent-amber-500"
                onChange={e => patch({ cookieSession: e.target.checked })} />
              <span className="text-xs text-gray-400">Shared cookie jar across requests</span>
            </ToggleRow>
            {settings.cookieSession && (
              <Row label="Jar ID">
                <input className={fi} value={settings.cookieJarId} placeholder="default"
                  onChange={e => patch({ cookieJarId: e.target.value })} />
              </Row>
            )}

            <Sec title="Rate Limiting" />
            <ToggleRow label="Enable">
              <input type="checkbox" checked={settings.rateLimitEnabled} className="accent-red-400"
                onChange={e => patch({ rateLimitEnabled: e.target.checked })} />
              <span className="text-xs text-gray-400">Limit requests per second</span>
            </ToggleRow>
            {settings.rateLimitEnabled && <>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <Row label="Rate /sec">
                  <input type="number" className={fi} min={0.1} step={0.1} value={settings.ratePerSecond}
                    onChange={e => patch({ ratePerSecond: Number(e.target.value) })} />
                </Row>
                <Row label="Burst">
                  <input type="number" className={fi} min={1} value={settings.burstSize}
                    onChange={e => patch({ burstSize: Number(e.target.value) })} />
                </Row>
              </div>
              <Row label="Backoff on Codes">
                <input className={fi} value={settings.backoffCodes} placeholder="429,503"
                  onChange={e => patch({ backoffCodes: e.target.value })} />
              </Row>
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <Row label="Initial Backoff (ms)">
                  <input type="number" className={fi} min={100} value={settings.backoffMs}
                    onChange={e => patch({ backoffMs: Number(e.target.value) })} />
                </Row>
                <Row label="Max Backoff (ms)">
                  <input type="number" className={fi} min={1000} value={settings.maxBackoffMs}
                    onChange={e => patch({ maxBackoffMs: Number(e.target.value) })} />
                </Row>
                <Row label="Multiplier">
                  <input type="number" className={fi} min={1} step={0.1} value={settings.backoffMultiplier}
                    onChange={e => patch({ backoffMultiplier: Number(e.target.value) })} />
                </Row>
                <div className="flex items-end pb-1 mb-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={settings.backoffJitter} className="accent-red-400"
                      onChange={e => patch({ backoffJitter: e.target.checked })} />
                    <span className="text-xs text-gray-400">Jitter</span>
                  </label>
                </div>
              </div>
            </>}
          </div>

          <div>
            <Sec title="Fingerprint Profile" />
            <Row label="Mode">
              <Chips
                options={[{v:'none',l:'None'},{v:'random',l:'Random'},{v:'preset',l:'Preset'}]}
                value={settings.fingerprintMode} onChange={v => patch({ fingerprintMode: v as FlowSettings['fingerprintMode'] })} accent="violet"
              />
            </Row>
            {settings.fingerprintMode === 'preset' && (
              <div className="grid grid-cols-2 gap-2 mb-2.5">
                <Row label="Browser">
                  <select className={fi} value={settings.fpBrowser} onChange={e => patch({ fpBrowser: e.target.value })}>
                    <option value="chrome">Chrome</option><option value="firefox">Firefox</option>
                    <option value="safari">Safari</option><option value="edge">Edge</option><option value="brave">Brave</option>
                  </select>
                </Row>
                <Row label="OS">
                  <select className={fi} value={settings.fpOs} onChange={e => patch({ fpOs: e.target.value })}>
                    <option value="windows">Windows</option><option value="macos">macOS</option>
                    <option value="linux">Linux</option><option value="android">Android</option><option value="ios">iOS</option>
                  </select>
                </Row>
              </div>
            )}

            <Sec title="Canvas / Audio" />
            <ToggleRow label="Canvas Noise">
              <input type="checkbox" checked={settings.canvasNoise} className="accent-violet-500"
                onChange={e => patch({ canvasNoise: e.target.checked })} />
              <span className="text-xs text-gray-400">Randomise canvas fingerprint per request</span>
            </ToggleRow>
            <ToggleRow label="Audio Noise">
              <input type="checkbox" checked={settings.audioNoise} className="accent-violet-500"
                onChange={e => patch({ audioNoise: e.target.checked })} />
              <span className="text-xs text-gray-400">Add subtle noise to AudioContext output</span>
            </ToggleRow>

            <Sec title="Screen Resolution" />
            <Row label="Mode">
              <Chips
                options={[{v:'native',l:'Native'},{v:'random',l:'Random'},{v:'preset',l:'Preset'}]}
                value={settings.screenMode} onChange={v => patch({ screenMode: v as FlowSettings['screenMode'] })} accent="violet"
              />
            </Row>
            {settings.screenMode === 'preset' && (
              <div className="grid grid-cols-3 gap-2 mb-2.5">
                <Row label="Width">
                  <input type="number" className={fi} min={320} max={7680} value={settings.screenWidth}
                    onChange={e => patch({ screenWidth: Number(e.target.value) })} />
                </Row>
                <Row label="Height">
                  <input type="number" className={fi} min={240} max={4320} value={settings.screenHeight}
                    onChange={e => patch({ screenHeight: Number(e.target.value) })} />
                </Row>
                <Row label="Color Depth">
                  <select className={fi} value={settings.colorDepth} onChange={e => patch({ colorDepth: Number(e.target.value) as 24 | 32 })}>
                    <option value={24}>24-bit</option><option value={32}>32-bit</option>
                  </select>
                </Row>
              </div>
            )}
            {settings.screenMode === 'random' && (
              <div className="text-[10px] text-gray-600 mb-2">Picks a random resolution from common desktop presets each run.</div>
            )}

            <Sec title="WebGL" />
            <Row label="Mode">
              <Chips
                options={[{v:'none',l:'Native'},{v:'noise',l:'Noise'},{v:'spoof',l:'Spoof'}]}
                value={settings.webglMode} onChange={v => patch({ webglMode: v as FlowSettings['webglMode'] })} accent="violet"
              />
            </Row>
            {settings.webglMode === 'spoof' && <>
              <Row label="Vendor">
                <input className={fi} value={settings.webglVendor} placeholder="Intel Inc."
                  onChange={e => patch({ webglVendor: e.target.value })} />
              </Row>
              <Row label="Renderer">
                <input className={fi} value={settings.webglRenderer} placeholder="Intel Iris OpenGL Engine"
                  onChange={e => patch({ webglRenderer: e.target.value })} />
              </Row>
            </>}
            {settings.webglMode === 'noise' && (
              <div className="text-[10px] text-gray-600 mb-2">Adds subtle per-request noise to WebGL readback values.</div>
            )}

            <Sec title="WebRTC" />
            <Row label="Mode">
              <Chips
                options={[{v:'native',l:'Native'},{v:'disable',l:'Disable'},{v:'replace',l:'Replace IP'}]}
                value={settings.webrtcMode} onChange={v => patch({ webrtcMode: v as FlowSettings['webrtcMode'] })} accent="violet"
              />
            </Row>
            {settings.webrtcMode === 'replace' && (
              <Row label="Fake IP">
                <input className={fi} value={settings.webrtcIp} placeholder="203.0.113.42"
                  onChange={e => patch({ webrtcIp: e.target.value })} />
              </Row>
            )}
            {settings.webrtcMode === 'disable' && (
              <div className="text-[10px] text-gray-600 mb-2">WebRTC is fully blocked — prevents IP leak via STUN.</div>
            )}

            <Sec title="Navigator Properties" />
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <Row label="Hardware Threads">
                  <Chips
                    options={[{v:'native',l:'Native'},{v:'random',l:'Random'},{v:'preset',l:'Preset'}]}
                    value={settings.hardwareConcurrencyMode}
                    onChange={v => patch({ hardwareConcurrencyMode: v as FlowSettings['hardwareConcurrencyMode'] })} accent="violet"
                  />
                </Row>
                {settings.hardwareConcurrencyMode === 'preset' && (
                  <select className={`${fi} mt-1`} value={settings.hardwareConcurrencyValue}
                    onChange={e => patch({ hardwareConcurrencyValue: Number(e.target.value) })}>
                    {[2,4,6,8,10,12,16].map(n => <option key={n} value={n}>{n} threads</option>)}
                  </select>
                )}
              </div>
              <div>
                <Row label="Device Memory">
                  <Chips
                    options={[{v:'native',l:'Native'},{v:'random',l:'Random'},{v:'preset',l:'Preset'}]}
                    value={settings.deviceMemoryMode}
                    onChange={v => patch({ deviceMemoryMode: v as FlowSettings['deviceMemoryMode'] })} accent="violet"
                  />
                </Row>
                {settings.deviceMemoryMode === 'preset' && (
                  <select className={`${fi} mt-1`} value={settings.deviceMemoryValue}
                    onChange={e => patch({ deviceMemoryValue: Number(e.target.value) })}>
                    {[1,2,4,8,16,32].map(n => <option key={n} value={n}>{n} GB</option>)}
                  </select>
                )}
              </div>
            </div>

            <Sec title="Locale" />
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <Row label="Timezone">
                <input className={fi} value={settings.timezone} placeholder="America/New_York"
                  onChange={e => patch({ timezone: e.target.value })} />
              </Row>
              <Row label="Language">
                <input className={fi} value={settings.language} placeholder="en-US"
                  onChange={e => patch({ language: e.target.value })} />
              </Row>
            </div>

            <Sec title="Privacy Headers" />
            <Row label="Do Not Track">
              <Chips
                options={[{v:'unset',l:'Unset'},{v:'1',l:'DNT: 1 (opt-out)'},{v:'0',l:'DNT: 0 (consent)'}]}
                value={settings.doNotTrack} onChange={v => patch({ doNotTrack: v as FlowSettings['doNotTrack'] })} accent="violet"
              />
            </Row>
            <Row label="Referrer Policy">
              <select className={fi} value={settings.referrerPolicy}
                onChange={e => patch({ referrerPolicy: e.target.value as FlowSettings['referrerPolicy'] })}>
                <option value="default">Browser default</option>
                <option value="no-referrer">No Referrer</option>
                <option value="same-origin">Same Origin only</option>
                <option value="strict-origin">Strict Origin</option>
                <option value="unsafe-url">Always send full URL</option>
              </select>
            </Row>

          </div>

        </div>
      </div>}
    </div>
  );
}

function PaletteItem({ type, label, description, dot, color, border, disabled = false }: {
  type: string; label: string; description: string;
  dot: string; color: string; border: string; disabled?: boolean;
}) {
  if (disabled) {
    return (
      <div className="flex items-start gap-2 px-2 py-1.5 rounded border border-white/5 bg-[#1e2130] opacity-35 cursor-not-allowed select-none">
        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5 bg-gray-600" />
        <div>
          <div className="text-xs font-medium text-gray-600">{label}</div>
          <div className="text-[10px] text-gray-700">{description}</div>
        </div>
      </div>
    );
  }
  return (
    <div draggable
      onDragStart={e => { e.dataTransfer.setData('application/reactflow', type); e.dataTransfer.effectAllowed = 'move'; }}
      className={`flex items-start gap-2 px-2 py-1.5 rounded border ${border} bg-[#1e2130] cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors select-none`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${dot}`} />
      <div>
        <div className={`text-xs font-medium ${color}`}>{label}</div>
        <div className="text-[10px] text-gray-600">{description}</div>
      </div>
    </div>
  );
}


type MenuItemDef =
  | { sep: true }
  | { header: string }
  | { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; checked?: boolean; hint?: string };

function MenuDropdown({
  label, open, onToggle, items,
}: {
  label: string;
  open: boolean;
  onToggle: (e: React.MouseEvent) => void;
  items: MenuItemDef[];
}) {
  return (
    <div className="relative h-full" onMouseDown={e => e.stopPropagation()}>
      <button
        onMouseDown={onToggle}
        className={`h-full px-3 text-xs font-medium transition-colors ${
          open ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`}
      >
        {label}
      </button>
      {open && (
        <div className="absolute top-full left-0 min-w-[180px] bg-[#1e2130] border border-white/10 rounded-b-lg rounded-tr-lg shadow-2xl py-1 z-50">
          {items.map((item, i) =>
            'sep' in item ? (
              <div key={i} className="my-1 border-t border-white/5" />
            ) : 'header' in item ? (
              <div key={i} className="px-3 pt-2 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-gray-600 select-none">
                {item.header}
              </div>
            ) : (
              <button
                key={i}
                onMouseDown={() => { if (!item.disabled) { item.onClick(); } }}
                disabled={item.disabled}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-left transition-colors
                  ${item.disabled ? 'opacity-30 cursor-not-allowed text-gray-500'
                    : item.danger   ? 'text-red-400 hover:bg-red-500/10'
                    :                 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="w-3 flex-shrink-0 text-indigo-400">
                  {'checked' in item && item.checked ? '✓' : ''}
                </span>
                <span className="flex-1">{item.label}</span>
                {'hint' in item && item.hint && (
                  <span className="text-[10px] text-gray-600 ml-2 font-mono">{item.hint}</span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}


const ZOOM_STEP = 0.05;
function snapZoom(z: number) { return Math.round(z / ZOOM_STEP) * ZOOM_STEP; }

function ZoomSlider({ minZoom, maxZoom }: { minZoom: number; maxZoom: number }) {
  const { zoom } = useViewport();
  const { zoomTo } = useReactFlow();
  const snapped = snapZoom(zoom);
  const pct = Math.round(snapped * 100);

  function step(dir: 1 | -1) {
    const next = snapZoom(snapped + dir * ZOOM_STEP);
    zoomTo(Math.max(minZoom, Math.min(maxZoom, next)), { duration: 150 });
  }

  return (
    <div
      className="absolute bottom-2 right-2 flex items-center gap-1.5 opacity-40 hover:opacity-90 transition-opacity z-10"
      style={{ pointerEvents: 'all' }}
    >
      <button
        className="text-gray-500 hover:text-gray-200 text-sm leading-none select-none transition-colors w-4 text-center"
        onClick={() => step(-1)}
      >−</button>
      <input
        type="range"
        min={minZoom} max={maxZoom} step={ZOOM_STEP}
        value={snapped}
        onChange={e => zoomTo(snapZoom(Number(e.target.value)), { duration: 0 })}
        className="w-20 accent-indigo-500 cursor-pointer"
      />
      <button
        className="text-gray-500 hover:text-gray-200 text-sm leading-none select-none transition-colors w-4 text-center"
        onClick={() => step(1)}
      >+</button>
      <span className="text-[10px] text-gray-600 font-mono w-7 text-right">{pct}%</span>
    </div>
  );
}


const PRESETS_KEY = 'axiom:presets:v1';
const DANGEROUS_TYPES = new Set(['terminal', 'file_read', 'file_write', 'ssh_execute', 'ftp_sftp', 'tcp_connect']);
const DANGEROUS_LABELS: Record<string, string> = {
  terminal:    'Terminal',
  file_read:   'File Read',
  file_write:  'File Write',
  ssh_execute: 'SSH Execute',
  ftp_sftp:    'FTP/SFTP',
  tcp_connect: 'TCP Connect',
};

interface PresetMeta {
  displayName: string;
  presetVersion: string;
  author: string;
  authorLink: string;
  description: string;
}

interface StoredPreset extends PresetMeta {
  id: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  savedAt: string;
  nodeCount: number;
  dangerousTypes: string[];
}

const DEFAULT_PRESET: StoredPreset = {
  id: 'builtin-default',
  name: 'default',
  displayName: 'Default',
  presetVersion: '1.0.0',
  author: 'Axiom',
  authorLink: '',
  description: 'HTTP Request ▶ Parse ▶ Output. The basic starter preset.',
  nodes: STARTER_NODES,
  edges: STARTER_EDGES,
  savedAt: '2024-01-01T00:00:00.000Z',
  nodeCount: STARTER_NODES.length,
  dangerousTypes: [],
};

function loadPresets(): StoredPreset[] {
  try {
    const stored = JSON.parse(localStorage.getItem(PRESETS_KEY) ?? 'null');
    if (!Array.isArray(stored)) return [DEFAULT_PRESET];
    const without = stored.filter((p: StoredPreset) => p.id !== 'builtin-default');
    return [DEFAULT_PRESET, ...without];
  } catch { return [DEFAULT_PRESET]; }
}
function savePresets(list: StoredPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(list.filter(p => p.id !== 'builtin-default')));
}
function detectDangerous(nodes: Node[]): string[] {
  const found = new Set<string>();
  for (const n of nodes) { if (DANGEROUS_TYPES.has(n.type ?? '')) found.add(n.type!); }
  return Array.from(found);
}

function PresetsPanel({ currentNodes, currentEdges, onLoad, flowName, flowNames, onSelectFlow, onNewFlow, onDeleteFlow }: {
  currentNodes: Node[];
  currentEdges: Edge[];
  onLoad: (nodes: Node[], edges: Edge[]) => void;
  flowName: string;
  flowNames: string[];
  onSelectFlow: (name: string) => void;
  onNewFlow: () => void;
  onDeleteFlow: (name: string) => void;
}) {
  const [allFlows, setAllFlows] = useState<Record<string, SavedFlow>>(() => loadFlows());
  const [renamingFlow, setRenamingFlow] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef<HTMLInputElement>(null);
  const [exportFlowTarget, setExportFlowTarget] = useState<StoredPreset | null>(null);

  const [presets, setPresets] = useState<StoredPreset[]>(() => loadPresets());
  const [warn, setWarn] = useState<{ preset: StoredPreset; onConfirm: () => void } | null>(null);
  const [exportTarget, setExportTarget] = useState<StoredPreset | null>(null);
  const [error, setError] = useState('');

  const [divW, setDivW] = useState(280);
  const divDragRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => { setAllFlows(loadFlows()); }, [flowNames, flowName]);

  useEffect(() => {
    if (renamingFlow) setTimeout(() => renameRef.current?.focus(), 30);
  }, [renamingFlow]);

  function onDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    divDragRef.current = { startX: e.clientX, startW: divW };
    function onMove(ev: MouseEvent) {
      if (!divDragRef.current) return;
      setDivW(Math.max(180, Math.min(520, divDragRef.current.startW + ev.clientX - divDragRef.current.startX)));
    }
    function onUp() { divDragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function commitRenameFlow() {
    if (!renamingFlow) return;
    const t = renameVal.trim();
    if (!t || t === renamingFlow) { setRenamingFlow(null); return; }
    const flows = loadFlows();
    if (flows[t]) { setRenamingFlow(null); return; }
    const cur = flows[renamingFlow];
    if (cur) { flows[t] = { ...cur, name: t }; delete flows[renamingFlow]; saveFlows(flows); }
    setAllFlows(loadFlows());
    if (flowName === renamingFlow) onSelectFlow(t);
    setRenamingFlow(null);
  }

  function persist(list: StoredPreset[]) { setPresets(list); savePresets(list); }

  async function doExportFlow(p: StoredPreset, meta: PresetMeta) {
    setExportFlowTarget(null);
    try {
      const path = await SaveAxprojDialog(p.name);
      if (!path) return;
      const content = JSON.stringify({
        version: 1, name: p.name,
        displayName:   meta.displayName   || p.name,
        presetVersion: meta.presetVersion || '',
        author:        meta.author        || '',
        authorLink:    meta.authorLink    || '',
        description:   meta.description   || '',
        nodes: p.nodes, edges: p.edges, savedAt: p.savedAt,
      }, null, 2);
      await WriteTextFile(path, content);
    } catch (e) { setError(String(e)); }
  }

  async function doExport(p: StoredPreset, meta: PresetMeta) {
    setExportTarget(null); setError('');
    try {
      const path = await SaveAxprojDialog(p.name);
      if (!path) return;
      const content = JSON.stringify({
        version: 1, name: p.name,
        displayName:   meta.displayName   || p.name,
        presetVersion: meta.presetVersion || '',
        author:        meta.author        || '',
        authorLink:    meta.authorLink    || '',
        description:   meta.description   || '',
        nodes: p.nodes, edges: p.edges, savedAt: p.savedAt,
      }, null, 2);
      await WriteTextFile(path, content);
      persist(presets.map(x => x.id === p.id ? { ...x, ...meta } : x));
    } catch (e) { setError(String(e)); }
  }

  async function importAxproj() {
    setError('');
    try {
      const path = await OpenAxprojDialog();
      if (!path) return;
      const raw = await ReadTextFile(path);
      const data = JSON.parse(raw) as {
        version?: number; name?: string;
        displayName?: string; presetVersion?: string; author?: string; authorLink?: string; description?: string;
        nodes?: Node[]; edges?: Edge[]; savedAt?: string;
      };
      if (!Array.isArray(data.nodes)) { setError('Invalid .axproj file'); return; }
      const nodes = data.nodes as Node[];
      const edges = (data.edges ?? []) as Edge[];
      const dangerous = detectDangerous(nodes);
      const entry: StoredPreset = {
        id: Date.now().toString(36),
        name:          data.name ?? path.split(/[\\/]/).pop()?.replace(/\.axproj$/, '') ?? 'Imported',
        displayName:   data.displayName   ?? data.name ?? '',
        presetVersion: data.presetVersion ?? '',
        author:        data.author        ?? '',
        authorLink:    data.authorLink    ?? '',
        description:   data.description   ?? '',
        nodes, edges,
        savedAt: data.savedAt ?? new Date().toISOString(),
        nodeCount: nodes.filter(n => n.type !== 'comment').length,
        dangerousTypes: dangerous,
      };
      persist([entry, ...presets]);
      if (dangerous.length > 0) {
        setWarn({ preset: entry, onConfirm: () => { onLoad(entry.nodes, entry.edges); setWarn(null); } });
      } else {
        onLoad(entry.nodes, entry.edges);
      }
    } catch (e) { setError(String(e)); }
  }

  function loadPresetEntry(p: StoredPreset) {
    if (p.dangerousTypes.length > 0) {
      setWarn({ preset: p, onConfirm: () => { onLoad(p.nodes, p.edges); setWarn(null); } });
    } else {
      onLoad(p.nodes, p.edges);
    }
  }

  function deletePreset(id: string) { if (id === 'builtin-default') return; persist(presets.filter(p => p.id !== id)); }

  const fmt = (iso: string) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const myFlowNames = Array.from(new Set([...flowNames, flowName]));

  return (
    <div className="ax-fade-up flex-1 bg-[#0f1117] flex overflow-hidden">

      <div className="flex-shrink-0 flex flex-col overflow-hidden" style={{ width: divW }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#181b23] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-200">My Presets</span>
          <button onClick={onNewFlow}
            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors">
            + New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {myFlowNames.length === 0 && (
            <div className="p-6 text-center text-gray-700 text-xs">No presets yet</div>
          )}
          {myFlowNames.map(name => {
            const flow = allFlows[name];
            const nodeCount = flow?.nodes.filter((n: Node) => n.type !== 'comment').length ?? 0;
            const isActive = name === flowName;
            const isRenaming = renamingFlow === name;
            return (
              <div key={name}
                className={`border-b border-white/[0.04] transition-colors ${isActive ? 'bg-indigo-500/10' : 'hover:bg-white/[0.02]'}`}>
                <div
                  onClick={() => !isRenaming && onSelectFlow(name)}
                  className="flex items-center gap-2.5 px-4 pt-3 pb-1.5 cursor-pointer select-none">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${isActive ? 'bg-indigo-400' : 'bg-white/15'}`} />
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input
                        ref={renameRef}
                        className="bg-[#0d0f14] border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none w-full"
                        value={renameVal}
                        onChange={e => setRenameVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') commitRenameFlow(); if (e.key === 'Escape') setRenamingFlow(null); }}
                        onBlur={commitRenameFlow}
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-200' : 'text-gray-300'}`}
                        onDoubleClick={e => { e.stopPropagation(); setRenamingFlow(name); setRenameVal(name); }}
                        title="Double-click to rename">
                        {name}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-600 mt-0.5">{nodeCount} node{nodeCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <div className="flex gap-1.5 px-4 pb-2.5">
                  <button
                    onClick={() => onSelectFlow(name)}
                    className={`flex-1 py-0.5 rounded text-[10px] border transition-colors ${
                      isActive
                        ? 'border-indigo-500/60 text-indigo-300 bg-indigo-500/10'
                        : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
                    }`}>
                    {isActive ? 'Active' : 'Load'}
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      const f = allFlows[name];
                      if (!f) return;
                      setExportFlowTarget({
                        id: name, name,
                        displayName: name, presetVersion: '', author: '', authorLink: '', description: '',
                        nodes: f.nodes, edges: f.edges,
                        savedAt: new Date().toISOString(),
                        nodeCount: f.nodes.filter((n: Node) => n.type !== 'comment').length,
                        dangerousTypes: detectDangerous(f.nodes),
                      });
                    }}
                    className="flex-1 py-0.5 rounded text-[10px] border border-white/10 text-gray-500 hover:text-gray-200 hover:border-white/20 transition-colors">
                    Export
                  </button>
                  {name !== 'default' && (
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteFlow(name); }}
                      className="px-2 py-0.5 rounded text-[10px] border border-white/10 text-gray-600 hover:text-red-400 hover:border-red-500/30 transition-colors">
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div onMouseDown={onDividerMouseDown}
        className="w-1 flex-shrink-0 bg-white/5 hover:bg-indigo-500/50 active:bg-indigo-500/70 cursor-col-resize transition-colors" />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#181b23] flex-shrink-0">
          <span className="text-sm font-semibold text-gray-200">Saved Presets</span>
          <button onClick={importAxproj}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 text-xs text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors">
            <UploadIcon /> Import .axproj
          </button>
        </div>
        {error && <div className="px-4 py-2 text-[10px] text-red-400 border-b border-white/5 break-all flex-shrink-0">{error}</div>}

        <div className="flex-1 overflow-y-auto p-4">
          {presets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-gray-600 text-sm mb-1">No saved presets</div>
              <div className="text-gray-700 text-xs">Import a .axproj file to get started</div>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {presets.map(p => {
                const title = p.displayName || p.name;
                return (
                  <div key={p.id} className="bg-[#181b23] border border-white/[0.07] rounded-lg p-3.5 flex flex-col gap-2 hover:border-white/15 transition-colors group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-semibold text-gray-200 leading-tight flex-1">{title}</div>
                      {p.id !== 'builtin-default' && (
                        <button onClick={() => deletePreset(p.id)}
                          className="text-[10px] text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 ml-1 mt-0.5">
                          ✕
                        </button>
                      )}
                    </div>

                    {(p.presetVersion || p.author) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {p.presetVersion && (
                          <span className="px-1 py-0.5 rounded text-[9px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">v{p.presetVersion}</span>
                        )}
                        {p.author && (
                          p.authorLink
                            ? <a href={p.authorLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-500 hover:text-indigo-300 transition-colors">by {p.author}</a>
                            : <span className="text-[10px] text-gray-600">by {p.author}</span>
                        )}
                      </div>
                    )}

                    {p.description && (
                      <div className="text-[10px] text-gray-600 leading-relaxed line-clamp-2 whitespace-pre-wrap">{p.description}</div>
                    )}

                    <div className="text-[10px] text-gray-700">{p.nodeCount} node{p.nodeCount !== 1 ? 's' : ''} · {fmt(p.savedAt)}</div>

                    {p.dangerousTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {p.dangerousTypes.map(t => (
                          <span key={t} className="px-1 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {DANGEROUS_LABELS[t] ?? t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-1.5 mt-auto pt-1">
                      <button onClick={() => loadPresetEntry(p)}
                        className="flex-1 py-1 rounded text-[10px] border border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10 transition-colors">
                        Load
                      </button>
                      {p.id !== 'builtin-default' && (
                        <button onClick={() => setExportTarget(p)}
                          className="flex-1 py-1 rounded text-[10px] border border-white/10 text-gray-500 hover:text-gray-200 hover:border-white/20 transition-colors">
                          Export
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {exportFlowTarget && (
        <ExportMetaModal preset={exportFlowTarget} onConfirm={meta => doExportFlow(exportFlowTarget, meta)} onCancel={() => setExportFlowTarget(null)} />
      )}

      {exportTarget && (
        <ExportMetaModal preset={exportTarget} onConfirm={meta => doExport(exportTarget, meta)} onCancel={() => setExportTarget(null)} />
      )}

      {warn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#181b23] border border-amber-500/40 rounded-xl shadow-2xl w-[380px] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-400 text-lg">⚠</span>
              <h3 className="text-sm font-semibold text-gray-200">Security Warning</h3>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              The preset <span className="text-gray-200 font-medium">"{warn.preset.displayName || warn.preset.name}"</span> contains nodes that can access local system resources:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {warn.preset.dangerousTypes.map(t => (
                <span key={t} className="px-2 py-0.5 rounded text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30">{DANGEROUS_LABELS[t] ?? t}</span>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 mb-4">Only load presets from sources you trust. These nodes can read/write files, execute shell commands, and make network connections.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setWarn(null)} className="px-4 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
              <button onClick={warn.onConfirm} className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-xs text-white font-medium transition-colors">Load Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExportMetaModal({ preset, onConfirm, onCancel }: {
  preset: StoredPreset;
  onConfirm: (meta: PresetMeta) => void;
  onCancel: () => void;
}) {
  const [meta, setMeta] = useState<PresetMeta>({
    displayName:   preset.displayName   || preset.name,
    presetVersion: preset.presetVersion || '',
    author:        preset.author        || '',
    authorLink:    preset.authorLink    || '',
    description:   preset.description   || '',
  });
  function patch(p: Partial<PresetMeta>) { setMeta(m => ({ ...m, ...p })); }
  const inp = 'w-full bg-[#0d0f14] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#181b23] border border-white/10 rounded-xl shadow-2xl w-[440px] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Export Preset</h2>
            <p className="text-[10px] text-gray-600 mt-0.5">Add metadata before saving as .axproj</p>
          </div>
          <button onClick={onCancel} className="text-gray-600 hover:text-gray-300 text-sm">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Display Name</label>
            <input className={inp} value={meta.displayName} placeholder="My Awesome Preset"
              onChange={e => patch({ displayName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Version</label>
              <input className={inp} value={meta.presetVersion} placeholder="1.0.0"
                onChange={e => patch({ presetVersion: e.target.value })} />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Author</label>
              <input className={inp} value={meta.author} placeholder="Your Name"
                onChange={e => patch({ author: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Author Link</label>
            <input className={inp} value={meta.authorLink} placeholder="https://github.com/you"
              onChange={e => patch({ authorLink: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <textarea className={`${inp} h-24 resize-none leading-relaxed`}
              value={meta.description} placeholder="Describe what this preset does…"
              onChange={e => patch({ description: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5 flex-shrink-0">
          <button onClick={onCancel}
            className="px-4 py-1.5 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(meta)}
            className="px-5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs text-white font-medium transition-colors">
            Save .axproj
          </button>
        </div>
      </div>
    </div>
  );
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full w-full">
        <CanvasInner />
      </div>
    </ReactFlowProvider>
  );
}
