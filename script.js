// ============================================
// SECTION SWITCHING (toolbar tools + canvas tabs)
// ============================================
const tools = document.querySelectorAll('.tool[data-section]');
const tabs = document.querySelectorAll('.tab[data-section]');
const sections = document.querySelectorAll('.canvas-section');
const propLayer = document.getElementById('propLayer');
const statusMsg = document.getElementById('statusMsg');

const sectionLabels = {
  about: 'About',
  work: 'Work',
  skills: 'Skills',
  resume: 'Resume',
  contact: 'Contact'
};

function setActiveSection(name) {
  tools.forEach(t => t.classList.toggle('active', t.dataset.section === name));
  tabs.forEach(t => t.classList.toggle('active', t.dataset.section === name));
  sections.forEach(s => s.classList.toggle('active', s.id === `section-${name}`));
  if (propLayer) propLayer.textContent = sectionLabels[name] || name;
  if (statusMsg) statusMsg.textContent = `Viewing ${sectionLabels[name]}.psd`;
  closeMobilePanels();
}

tools.forEach(tool => {
  tool.addEventListener('click', () => setActiveSection(tool.dataset.section));
});
tabs.forEach(tab => {
  tab.addEventListener('click', () => setActiveSection(tab.dataset.section));
});

// ============================================
// SWATCHES — click to recolor accent, hover to light up matching skill
// ============================================
const swatches = document.querySelectorAll('.swatch');
const skillRows = document.querySelectorAll('.skill-row');
const swatchFg = document.getElementById('swatchFg');
const root = document.documentElement;

const defaultAccent = '#d99a44';

function hexToSoft(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.16)`;
}

swatches.forEach(sw => {
  const color = getComputedStyle(sw).getPropertyValue('--sw').trim();

  sw.addEventListener('click', () => {
    const key = sw.dataset.color;
    if (key === 'default') {
      root.style.setProperty('--accent', defaultAccent);
      root.style.setProperty('--accent-soft', hexToSoft(defaultAccent));
      if (swatchFg) swatchFg.style.background = defaultAccent;
      statusMsg.textContent = 'Accent reset';
    } else {
      root.style.setProperty('--accent', color);
      root.style.setProperty('--accent-soft', hexToSoft(color));
      if (swatchFg) swatchFg.style.background = color;
      statusMsg.textContent = `Foreground color set — ${sw.dataset.tooltip}`;
    }
  });

  sw.addEventListener('mouseenter', () => {
    skillRows.forEach(row => {
      row.classList.toggle('lit', row.dataset.color === sw.dataset.color);
    });
  });
  sw.addEventListener('mouseleave', () => {
    skillRows.forEach(row => row.classList.remove('lit'));
  });
});

// ============================================
// LAYERS PANEL — toggle project visibility, click to focus
// ============================================
const layerRows = document.querySelectorAll('.layer-row');

layerRows.forEach(row => {
  const eye = row.querySelector('.layer-eye');
  const layerKey = row.dataset.layer;
  const card = document.querySelector(`.project-card[data-layer="${layerKey}"]`);

  eye.addEventListener('click', (e) => {
    e.stopPropagation();
    row.classList.toggle('dimmed');
    if (card) card.classList.toggle('hidden-layer');
    statusMsg.textContent = row.classList.contains('dimmed')
      ? `Hid layer — ${row.querySelector('.layer-name').textContent}`
      : `Showed layer — ${row.querySelector('.layer-name').textContent}`;
  });

  row.addEventListener('click', () => {
    setActiveSection('work');
    layerRows.forEach(r => r.classList.remove('active-layer'));
    row.classList.add('active-layer');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.remove('hidden-layer');
      row.classList.remove('dimmed');
    }
  });
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
  if (opening) {
    toolbarEl.classList.add('open');
    overlayEl.classList.add('show');
  }
});

toggleRight.addEventListener('click', () => {
  const opening = !panelsEl.classList.contains('open');
  closeMobilePanels();
  if (opening) {
    panelsEl.classList.add('open');
    overlayEl.classList.add('show');
  }
});

overlayEl.addEventListener('click', closeMobilePanels);

// ============================================
// STATUS BAR — simple live clock in place of a real zoom %, adds life
// ============================================
const statusZoom = document.getElementById('statusZoom');
let zoom = 100;
document.addEventListener('wheel', (e) => {
  // purely cosmetic zoom readout, does not actually scale anything
}, { passive: true });
