// ============================================
// STATE
// ============================================
let currentTool = 'move';
let currentColor = '#d99a44';
let brushSize = 8;
let zoomLevel = 100;
let dpr = window.devicePixelRatio || 1;

const viewport = document.getElementById('viewport');
const doodleCanvas = document.getElementById('doodleCanvas');
const ctx = doodleCanvas.getContext('2d');
const toolOverlay = document.getElementById('toolOverlay');
const swatchFg = document.getElementById('swatchFg');
const statusMsg = document.getElementById('statusMsg');
const statusZoom = document.getElementById('statusZoom');
const propertiesBody = document.getElementById('propertiesBody');
const pageSections = document.getElementById('pageSections');

const toolHints = {
  move: 'Move tool selected — click a layer on the right to jump to it.',
  lasso: 'Lasso — drag on the scratch layer to mark a selection.',
  crop: 'Crop — drag a box on the scratch layer, release to crop it.',
  eyedropper: 'Eyedropper — click the scratch layer to sample a color.',
  brush: 'Brush — draw on the scratch layer.',
  eraser: 'Eraser — drag on the scratch layer to erase.',
  type: 'Type — click the scratch layer to place text.',
  hand: 'Hand tool — drag anywhere on the page to pan.',
  zoom: 'Zoom — click to zoom in, Alt+click to zoom out, double-click to reset.'
};

// ============================================
// TOOL SELECTION
// ============================================
const toolButtons = document.querySelectorAll('.tool[data-tool]');

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(b => b.classList.toggle('active', b.dataset.tool === tool));

  viewport.classList.toggle('tool-hand', tool === 'hand');
  viewport.classList.toggle('tool-zoom', tool === 'zoom');

  doodleCanvas.classList.remove('cursor-crosshair', 'cursor-text', 'cursor-default');
  if (['brush', 'eraser', 'eyedropper', 'lasso', 'crop'].includes(tool)) {
    doodleCanvas.classList.add('cursor-crosshair');
  } else if (tool === 'type') {
    doodleCanvas.classList.add('cursor-text');
  } else {
    doodleCanvas.classList.add('cursor-default');
  }

  statusMsg.textContent = toolHints[tool] || 'Ready';
  updatePropertiesPanel();
}

toolButtons.forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));

// ============================================
// PROPERTIES PANEL
// ============================================
function updatePropertiesPanel() {
  let html = '';
  switch (currentTool) {
    case 'move':
      html = `<div class="prop-hint">Auto-select: Layer. Use the Layers panel to jump between sections of the page.</div>`;
      break;
    case 'lasso':
      html = `<div class="prop-row"><span>Feather</span><span>0 px</span></div>
              <div class="prop-row"><span>Anti-alias</span><span>On</span></div>
              <div class="prop-hint">Drag on the scratch layer to draw a selection marquee.</div>`;
      break;
    case 'crop':
      html = `<div class="prop-row"><span>Ratio</span><span>Freeform</span></div>
              <div class="prop-hint">Drag a box on the scratch layer, then release to crop it to that area.</div>`;
      break;
    case 'eyedropper':
      html = `<div class="prop-row"><span>Sample</span><span>Point</span></div>
              <div class="prop-row"><span>Last color</span><span class="prop-color-preview" style="background:${currentColor}"></span></div>`;
      break;
    case 'brush':
    case 'eraser':
      html = `<div class="prop-row"><span>Size</span><span id="brushSizeReadout">${brushSize}px</span></div>
              <input type="range" min="2" max="40" value="${brushSize}" class="prop-slider" id="brushSizeInput">
              <div class="prop-row"><span>Hardness</span><span>100%</span></div>
              ${currentTool === 'brush' ? `<div class="prop-row"><span>Color</span><span class="prop-color-preview" style="background:${currentColor}"></span></div>` : ''}`;
      break;
    case 'type':
      html = `<div class="prop-row"><span>Font</span><span>Space Grotesk</span></div>
              <div class="prop-row"><span>Size</span><span>20px</span></div>
              <div class="prop-row"><span>Color</span><span class="prop-color-preview" style="background:${currentColor}"></span></div>`;
      break;
    case 'hand':
      html = `<div class="prop-hint">Drag anywhere on the page to pan. Scroll works as usual too.</div>`;
      break;
    case 'zoom':
      html = `<div class="prop-row"><span>Zoom</span><span id="propZoomReadout">${zoomLevel}%</span></div>
              <div class="prop-hint">Click the page to zoom in. Hold Alt and click to zoom out.</div>`;
      break;
  }
  propertiesBody.innerHTML = html;

  const slider = document.getElementById('brushSizeInput');
  if (slider) {
    slider.addEventListener('input', (e) => {
      brushSize = Number(e.target.value);
      const readout = document.getElementById('brushSizeReadout');
      if (readout) readout.textContent = brushSize + 'px';
    });
  }
}

// ============================================
// SWATCHES — set current color (used by brush / type / eyedropper readout)
// ============================================
const swatches = document.querySelectorAll('.swatch');
const skillRows = document.querySelectorAll('.skill-row');
const root = document.documentElement;
const defaultAccent = '#d99a44';

function hexToSoft(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

function setCurrentColor(hex, label) {
  currentColor = hex;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-soft', hexToSoft(hex));
  if (swatchFg) swatchFg.style.background = hex;
  swatches.forEach(s => s.classList.remove('selected'));
  if (label) statusMsg.textContent = `Foreground color set — ${label}`;
  updatePropertiesPanel();
}

swatches.forEach(sw => {
  const color = getComputedStyle(sw).getPropertyValue('--sw').trim();
  sw.addEventListener('click', () => {
    if (sw.dataset.color === 'default') {
      setCurrentColor(defaultAccent, 'reset');
    } else {
      setCurrentColor(color, sw.dataset.tooltip);
      sw.classList.add('selected');
    }
  });
  sw.addEventListener('mouseenter', () => {
    skillRows.forEach(row => row.classList.toggle('lit', row.dataset.color === sw.dataset.color));
  });
  sw.addEventListener('mouseleave', () => {
    skillRows.forEach(row => row.classList.remove('lit'));
  });
});

// ============================================
// LAYERS PANEL — acts as the site menu
// ============================================
const layerRows = document.querySelectorAll('.layer-row');

layerRows.forEach(row => {
  const eye = row.querySelector('.layer-eye');
  const target = document.getElementById(row.dataset.target);

  eye.addEventListener('click', (e) => {
    e.stopPropagation();
    row.classList.toggle('dimmed');
    if (target) target.classList.toggle('section-hidden');
    statusMsg.textContent = row.classList.contains('dimmed')
      ? `Hid layer — ${row.querySelector('.layer-name').textContent}`
      : `Showed layer — ${row.querySelector('.layer-name').textContent}`;
  });

  row.addEventListener('click', () => {
    if (target) {
      target.classList.remove('section-hidden');
      row.classList.remove('dimmed');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// scrollspy: highlight the layer row matching the section in view
const sectionEls = document.querySelectorAll('.page-section');
const spy = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const row = document.querySelector(`.layer-row[data-target="${entry.target.id}"]`);
      if (row) {
        layerRows.forEach(r => r.classList.remove('active-layer'));
        row.classList.add('active-layer');
      }
    }
  });
}, { root: viewport, threshold: 0.5 });
sectionEls.forEach(sec => spy.observe(sec));

// ============================================
// SCRATCH CANVAS — brush / eraser / type / eyedropper / lasso / crop
// ============================================
function resizeCanvas() {
  dpr = window.devicePixelRatio || 1;
  const rect = doodleCanvas.getBoundingClientRect();
  doodleCanvas.width = Math.max(1, rect.width * dpr);
  doodleCanvas.height = Math.max(1, rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  toolOverlay.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
}
window.addEventListener('resize', () => { resizeCanvas(); });
resizeCanvas();

function getPos(e) {
  const rect = doodleCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

let isDrawing = false;
let lastPos = null;
let isLassoing = false;
let lassoPoints = [];
let isCropping = false;
let cropStart = null;

function clearOverlay() { toolOverlay.innerHTML = ''; }

doodleCanvas.addEventListener('pointerdown', (e) => {
  if (currentTool === 'hand' || currentTool === 'zoom') return;
  const pos = getPos(e);

  if (currentTool === 'brush' || currentTool === 'eraser') {
    isDrawing = true;
    lastPos = pos;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  } else if (currentTool === 'eyedropper') {
    sampleColor(pos);
  } else if (currentTool === 'type') {
    addTypeBox(pos);
  } else if (currentTool === 'lasso') {
    isLassoing = true;
    lassoPoints = [pos];
  } else if (currentTool === 'crop') {
    isCropping = true;
    cropStart = pos;
  }
});

doodleCanvas.addEventListener('pointermove', (e) => {
  const pos = getPos(e);

  if (isDrawing && (currentTool === 'brush' || currentTool === 'eraser')) {
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = brushSize;
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
    }
    ctx.stroke();
    lastPos = pos;
  } else if (isLassoing) {
    lassoPoints.push(pos);
    drawLassoOverlay();
  } else if (isCropping) {
    drawCropOverlay(cropStart, pos);
  }
});

function endDrawing() {
  if (isDrawing) {
    isDrawing = false;
    ctx.globalCompositeOperation = 'source-over';
  }
  if (isLassoing) {
    isLassoing = false;
    setTimeout(clearOverlay, 900);
  }
  if (isCropping && cropStart) {
    isCropping = false;
  }
}

doodleCanvas.addEventListener('pointerup', (e) => {
  if (currentTool === 'crop' && cropStart) {
    const pos = getPos(e);
    applyCrop(cropStart, pos);
    clearOverlay();
  }
  endDrawing();
});
doodleCanvas.addEventListener('pointerleave', endDrawing);

function drawLassoOverlay() {
  const d = lassoPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  toolOverlay.innerHTML = `<path class="marquee-lasso" d="${d}" fill="none"></path>`;
}

function drawCropOverlay(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  toolOverlay.innerHTML = `<rect class="marquee-rect" x="${x}" y="${y}" width="${w}" height="${h}"></rect>`;
}

function applyCrop(start, end) {
  const x0 = Math.min(start.x, end.x) * dpr;
  const y0 = Math.min(start.y, end.y) * dpr;
  const w = Math.abs(end.x - start.x) * dpr;
  const h = Math.abs(end.y - start.y) * dpr;
  if (w < 12 || h < 12) return;

  const imgData = ctx.getImageData(x0, y0, w, h);
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  tmp.getContext('2d').putImageData(imgData, 0, 0);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
  ctx.drawImage(tmp, 0, 0, w, h, 0, 0, doodleCanvas.width, doodleCanvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  statusMsg.textContent = 'Cropped scratch layer to selection.';
}

function sampleColor(pos) {
  const data = ctx.getImageData(pos.x * dpr, pos.y * dpr, 1, 1).data;
  if (data[3] === 0) {
    statusMsg.textContent = 'Sampled transparent pixel — draw something first.';
    return;
  }
  const hex = '#' + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('');
  setCurrentColor(hex, `sampled ${hex}`);
}

let typeBoxCount = 0;
function addTypeBox(pos) {
  const box = document.createElement('div');
  box.className = 'type-box';
  box.contentEditable = 'true';
  box.style.left = pos.x + 'px';
  box.style.top = pos.y + 'px';
  box.style.color = currentColor;
  box.dataset.id = ++typeBoxCount;
  doodleCanvas.parentElement.appendChild(box);
  box.focus();
  box.addEventListener('blur', () => {
    if (!box.textContent.trim()) box.remove();
  });
}

document.getElementById('clearCanvasBtn').addEventListener('click', () => {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, doodleCanvas.width, doodleCanvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  document.querySelectorAll('.type-box').forEach(t => t.remove());
  statusMsg.textContent = 'Scratch layer cleared.';
});

// ============================================
// HAND TOOL — drag to pan the whole page
// ============================================
let isPanning = false;
let panStart = { x: 0, y: 0, scrollTop: 0, scrollLeft: 0 };

viewport.addEventListener('pointerdown', (e) => {
  if (currentTool !== 'hand') return;
  isPanning = true;
  viewport.classList.add('panning');
  panStart = { x: e.clientX, y: e.clientY, scrollTop: viewport.scrollTop, scrollLeft: viewport.scrollLeft };
});
window.addEventListener('pointermove', (e) => {
  if (!isPanning) return;
  viewport.scrollTop = panStart.scrollTop - (e.clientY - panStart.y);
  viewport.scrollLeft = panStart.scrollLeft - (e.clientX - panStart.x);
});
window.addEventListener('pointerup', () => {
  isPanning = false;
  viewport.classList.remove('panning');
});

// ============================================
// ZOOM TOOL
// ============================================
function applyZoom() {
  pageSections.style.zoom = zoomLevel + '%';
  statusZoom.textContent = zoomLevel + '%';
  const readout = document.getElementById('propZoomReadout');
  if (readout) readout.textContent = zoomLevel + '%';
}

viewport.addEventListener('click', (e) => {
  if (currentTool !== 'zoom') return;
  if (e.altKey) {
    zoomLevel = Math.max(50, zoomLevel - 10);
  } else {
    zoomLevel = Math.min(200, zoomLevel + 10);
  }
  applyZoom();
});
viewport.addEventListener('dblclick', () => {
  if (currentTool !== 'zoom') return;
  zoomLevel = 100;
  applyZoom();
});
viewport.addEventListener('mousemove', (e) => {
  if (currentTool === 'zoom') viewport.classList.toggle('zoom-out-mode', e.altKey);
});

// ============================================
// MOBILE PANEL TOGGLES
// ============================================
const toolbarEl = document.getElementById('toolbar');
const panelsEl = document.getElementById('panels');
const overlayEl = document.getElementById('mobileOverlay');
const toggleLeft = document.getElementById('mobileToggleLeft');
const toggleRight = document.getElementById('mobileToggleRight');

function closeMobilePanels() {
  toolbarEl.classList.remove('open');
  panelsEl.classList.remove('open');
  overlayEl.classList.remove('show');
}
toggleLeft.addEventListener('click', () => {
  const opening = !toolbarEl.classList.contains('open');
  closeMobilePanels();
  if (opening) { toolbarEl.classList.add('open'); overlayEl.classList.add('show'); }
});
toggleRight.addEventListener('click', () => {
  const opening = !panelsEl.classList.contains('open');
  closeMobilePanels();
  if (opening) { panelsEl.classList.add('open'); overlayEl.classList.add('show'); }
});
overlayEl.addEventListener('click', closeMobilePanels);

// ============================================
// INIT
// ============================================
setTool('move');
setCurrentColor(currentColor, null);
