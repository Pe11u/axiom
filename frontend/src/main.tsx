import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'

import { applyPageZoom, zoomIn, zoomOut, zoomReset, PAGE_ZOOM_STEP, getPageZoom } from './pageZoom';

window.addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  applyPageZoom(getPageZoom() + (e.deltaY < 0 ? PAGE_ZOOM_STEP : -PAGE_ZOOM_STEP));
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (!e.ctrlKey) return;
  if (e.key === '=' || e.key === '+') { e.preventDefault(); zoomIn(); }
  else if (e.key === '-')              { e.preventDefault(); zoomOut(); }
  else if (e.key === '0')              { e.preventDefault(); zoomReset(); }
});

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)
