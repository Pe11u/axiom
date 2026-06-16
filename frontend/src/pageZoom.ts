export const PAGE_ZOOM_MIN  = 0.6;
export const PAGE_ZOOM_MAX  = 1.4;
export const PAGE_ZOOM_STEP = 0.1;

let _zoom = 1.0;

export function getPageZoom() { return _zoom; }

export function applyPageZoom(z: number) {
  _zoom = Math.round(Math.max(PAGE_ZOOM_MIN, Math.min(PAGE_ZOOM_MAX, z)) * 100) / 100;
  document.documentElement.style.setProperty('--page-zoom', String(_zoom));
}

export const zoomIn    = () => applyPageZoom(_zoom + PAGE_ZOOM_STEP);
export const zoomOut   = () => applyPageZoom(_zoom - PAGE_ZOOM_STEP);
export const zoomReset = () => applyPageZoom(1.0);
