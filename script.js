"use strict";

// The artwork bitmap has stable dimensions: resizing or zooming never wipes it.
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const viewport = $("#viewport");
const pageSections = $("#pageSections");
const root = document.documentElement;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const mobile = matchMedia("(max-width: 760px)");
const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
const statusMsg = $("#statusMsg");
const canvas = $("#doodleCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const overlay = $("#toolOverlay");
canvas.width = 1200;
canvas.height = 650;
overlay.setAttribute("viewBox", `0 0 ${canvas.width} ${canvas.height}`);
overlay.setAttribute("preserveAspectRatio", "none");
let currentTool = "move";
let currentColor = "#c7f28b";
let brushSize = 8;
let zoomLevel = 100;
let activePointer = null;
let gesture = null;
let textEditor = null;
let toastTimer;
let hasArtwork = false;
const toolHints = {
  move: "Browse work or try the drawing tools.",
  brush: "Draw on the playground. Ctrl / ⌘ Z to undo.",
  eraser: "Drag over your drawing to erase.",
  type: "Click the canvas to type. Enter to place, Escape to cancel.",
  lasso: "Drag to preview a freehand selection; release to dismiss.",
  crop: "Drag a rectangle to crop and fill the canvas.",
  eyedropper: "Click your drawing to sample a color.",
  hand: "Drag the canvas area to scroll the page.",
  zoom: "Click empty space to zoom. Alt-click to zoom out.",
};
const toolNames = {
  move: "Move",
  brush: "Brush",
  eraser: "Eraser",
  type: "Type",
  lasso: "Lasso",
  crop: "Crop",
  eyedropper: "Eyedropper",
  hand: "Hand",
  zoom: "Zoom",
};

function announce(message, toast = false) {
  statusMsg.textContent = message;
  if (toast) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("show");
    toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 3000);
  }
}

// Only the workspace mood is persisted. Drawing history stays in this tab.
const themes = {
  sage: { accent: "#c7f28b", rgb: "199,242,139", a: "#3b6349", b: "#827849" },
  violet: { accent: "#c5b4ff", rgb: "197,180,255", a: "#504d83", b: "#80637c" },
  blue: { accent: "#9cdcff", rgb: "156,220,255", a: "#32667c", b: "#4c7488" },
};
function savePreference(key, value) {
  try {
    localStorage.setItem(`jawad-workspace-${key}`, value);
  } catch {
    /* Private mode remains fully usable. */
  }
}
function readPreference(key) {
  try {
    return localStorage.getItem(`jawad-workspace-${key}`);
  } catch {
    return null;
  }
}
function setTheme(name) {
  const theme = themes[name] || themes.sage;
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-rgb", theme.rgb);
  root.style.setProperty("--accent-soft", `rgba(${theme.rgb},.12)`);
  root.style.setProperty("--scene-a", theme.a);
  root.style.setProperty("--scene-b", theme.b);
  $$(".theme-chip").forEach((button) => {
    const selected = button.dataset.theme === name;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  savePreference("theme", name);
}
$$(".theme-chip").forEach((button) =>
  button.addEventListener("click", () => setTheme(button.dataset.theme)),
);
function setFrost(value) {
  const frost = Math.max(8, Math.min(32, Number(value) || 20));
  root.style.setProperty("--glass-blur", `${frost}px`);
  $("#frostRange").value = frost;
  $("#frostOutput").value = frost;
  savePreference("frost", String(frost));
}
$("#frostRange").addEventListener("input", (event) =>
  setFrost(event.target.value),
);
setTheme(
  Object.hasOwn(themes, readPreference("theme"))
    ? readPreference("theme")
    : "sage",
);
setFrost(readPreference("frost"));

// Section navigation and layer visibility use real links and buttons.
const sectionEls = $$(".page-section");
const layerRows = $$(".layer-row");
function showSection(section) {
  section.classList.remove("section-hidden");
  const row = $(`.layer-row[data-target="${section.id}"]`);
  if (row) {
    row.classList.remove("dimmed");
    $(".layer-eye", row).setAttribute("aria-pressed", "true");
    $(".layer-eye", row).setAttribute(
      "aria-label",
      `Hide ${$(".layer-link>span:nth-child(2)", row).textContent}`,
    );
  }
}
function navigateTo(id, updateHash = true) {
  const section = document.getElementById(id);
  if (!section || !section.classList.contains("page-section")) return;
  showSection(section);
  closeMobilePanels(false);
  section.scrollIntoView({
    behavior: reducedMotion.matches ? "auto" : "smooth",
    block: "start",
  });
  // Make keyboard navigation land in the content, including after drawer closure.
  section.setAttribute("tabindex", "-1");
  section.focus({ preventScroll: true });
  if (updateHash) {
    try {
      history.replaceState(null, "", `#${id}`);
    } catch {
      /* file:// fallback */
    }
  }
  updateActiveSection(id);
}
$$('a[href^="#section-"]').forEach((link) =>
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigateTo(link.hash.slice(1));
  }),
);
layerRows.forEach((row) => {
  const button = $(".layer-eye", row);
  const section = document.getElementById(row.dataset.target);
  const label = $(".layer-link>span:nth-child(2)", row).textContent;
  button.addEventListener("click", () => {
    const visible = !section.classList.contains("section-hidden");
    if (
      visible &&
      sectionEls.filter((item) => !item.classList.contains("section-hidden"))
        .length === 1
    ) {
      announce("Keep at least one layer visible.", true);
      return;
    }
    if (section.id === "section-scratch") commitText();
    section.classList.toggle("section-hidden", visible);
    row.classList.toggle("dimmed", visible);
    button.setAttribute("aria-pressed", String(!visible));
    button.setAttribute("aria-label", `${visible ? "Show" : "Hide"} ${label}`);
    announce(`${visible ? "Hidden" : "Restored"} layer: ${label}`);
    updateScrollSpy();
  });
});
function updateActiveSection(id) {
  layerRows.forEach((row) => {
    const active = row.dataset.target === id;
    row.classList.toggle("active-layer", active);
    const link = $(".layer-link", row);
    if (active) {
      link.setAttribute("aria-current", "location");
      $("#activeLayerLabel").textContent = $(
        "span:nth-child(2)",
        link,
      ).textContent;
    } else link.removeAttribute("aria-current");
  });
  $$(".menu-items a, .mobile-nav a").forEach((link) => {
    const active = link.hash === `#${id}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
let scrollFrame = 0;
function updateScrollSpy() {
  const visible = sectionEls.filter(
    (section) => !section.classList.contains("section-hidden"),
  );
  if (!visible.length) return;
  const top =
    viewport.getBoundingClientRect().top +
    Math.min(140, viewport.clientHeight * 0.25);
  let active = visible[0];
  for (const section of visible) {
    if (section.getBoundingClientRect().top <= top) active = section;
  }
  if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 5)
    active = visible.at(-1);
  updateActiveSection(active.id);
}
viewport.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      updateScrollSpy();
      scrollFrame = 0;
    });
  },
  { passive: true },
);

// Small-screen drawers: mutually exclusive, inert when closed, Escape and focus trap.
const toolbar = $("#toolbar");
const panels = $("#panels");
const mobileOverlay = $("#mobileOverlay");
const drawerToggles = [$("#mobileToggleLeft"), $("#mobileToggleRight")];
let activeDrawer = null;
let drawerOpener = null;
function closeMobilePanels(restoreFocus = true) {
  const opener = drawerOpener;
  const wasOpen = Boolean(activeDrawer);
  toolbar.classList.remove("open");
  panels.classList.remove("open");
  mobileOverlay.classList.remove("show");
  drawerToggles.forEach((button) =>
    button.setAttribute("aria-expanded", "false"),
  );
  toolbar.inert = mobile.matches;
  panels.inert = mobile.matches;
  $("#main").inert = false;
  activeDrawer = null;
  drawerOpener = null;
  if (restoreFocus && wasOpen && opener) opener.focus({ preventScroll: true });
}
function openDrawer(drawer, opener) {
  if (activeDrawer === drawer) {
    closeMobilePanels();
    return;
  }
  closeMobilePanels(false);
  activeDrawer = drawer;
  drawerOpener = opener;
  drawer.inert = false;
  drawer.classList.add("open");
  mobileOverlay.classList.add("show");
  opener.setAttribute("aria-expanded", "true");
  $("#main").inert = true;
  $("button,a,input", drawer)?.focus({ preventScroll: true });
}
drawerToggles[0].addEventListener("click", () =>
  openDrawer(toolbar, drawerToggles[0]),
);
drawerToggles[1].addEventListener("click", () =>
  openDrawer(panels, drawerToggles[1]),
);
mobileOverlay.addEventListener("click", () => closeMobilePanels());
mobile.addEventListener("change", () => closeMobilePanels());
closeMobilePanels(false);

// Filterable project cards and a native dialog (focus trap, Escape, focus return).
const cards = $$(".project-card");
$$(".filter").forEach((button) =>
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    $$(".filter").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    cards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
    const count = cards.filter((card) => !card.hidden).length;
    $("#projectCount").textContent =
      `${count} PROJECT${count === 1 ? "" : "S"}`;
  }),
);
const projectDialog = $("#projectDialog");
let lastProjectOpener;
let activeProject = 0;
const projectDetails = [
  ['Real estate pitch deck', 'Layout system', 'Imagery direction', 'Investor-facing narrative'],
  ['8-slide pitch deck', 'Botanical wellness & skincare', 'Dark gold palette'],
  ['Logo mark', 'Line-art identity', 'Copper palette', 'Cinzel typography'],
  ['Presentation concept', 'Black-and-gold theme', 'Luxury visual direction'],
  ['18-slide academic deck', 'Full-bleed dark layouts', 'Original copy preserved']
];
const projectButtons = $$('.project-open');
function renderProject(index) {
  activeProject = index;
  const button = projectButtons[index];
  lastProjectOpener = button;
  $('#dialogArt').replaceChildren($('.project-art', button).cloneNode(true));
  $('#dialogTitle').textContent = $('h3', button).childNodes[0].textContent;
  $('#dialogCategory').textContent = $('.project-meta>span', button).textContent;
  $('#dialogDescription').textContent = $('.project-body>p', button).textContent;
  const details = button.dataset.details ? button.dataset.details.split('|') : (projectDetails[Number(button.dataset.project)] || []);
  const behanceLink = $('.button-primary', projectDialog);
  behanceLink.href = button.dataset.behance || 'https://www.behance.net/khawajajawad';
  behanceLink.innerHTML = button.dataset.behance ? 'View full project on Behance <span>↗</span>' : 'View portfolio on Behance <span>↗</span>';
  $('.preview-note', projectDialog).textContent = button.dataset.behance ? 'Original project cover from my Behance portfolio. Explore the full project on Behance.' : 'Project cover concept.';
  $('#dialogScope').replaceChildren(...details.map(detail => {
    const item = document.createElement('li'); item.textContent = detail; return item;
  }));
  const available = projectButtons.filter(item => !item.closest('.project-card').hidden);
  $('#projectPosition').textContent = `${available.indexOf(button) + 1} / ${available.length}`;
  $('#previousProject').disabled = $('#nextProject').disabled = available.length < 2;
  projectDialog.scrollTop = 0;
}
function stepProject(direction) {
  const available = projectButtons.map((button,index) => ({button,index})).filter(({button}) => !button.closest('.project-card').hidden);
  const current = available.findIndex(({index}) => index === activeProject);
  if (available.length > 1) renderProject(available[(current + direction + available.length) % available.length].index);
}
projectButtons.forEach((button,index) => button.addEventListener('click', () => {
  renderProject(index); projectDialog.showModal();
}));
$('#previousProject').addEventListener('click', () => stepProject(-1));
$('#nextProject').addEventListener('click', () => stepProject(1));
projectDialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault(); stepProject(event.key === 'ArrowRight' ? 1 : -1);
  }
});
$("#closeProjectBtn").addEventListener("click", () => projectDialog.close());
projectDialog.addEventListener("click", (event) => {
  const rect = projectDialog.getBoundingClientRect();
  if (
    event.target === projectDialog &&
    (event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom)
  )
    projectDialog.close();
});
projectDialog.addEventListener("close", () =>
  lastProjectOpener?.focus({ preventScroll: true }),
);

// Pointer highlights are local, inexpensive and disabled for touch/reduced motion.
$$(".project-card,.skill-row,#heroArtboard").forEach((surface) => {
  let frame = 0;
  const updateSurface = (event) => {
    if ((surface.id !== "heroArtboard" && !finePointer.matches) || reducedMotion.matches || frame) return;
    const { clientX, clientY } = event;
    frame = requestAnimationFrame(() => {
      const rect = surface.getBoundingClientRect();
      surface.style.setProperty("--mouse-x", `${clientX - rect.left}px`);
      surface.style.setProperty("--mouse-y", `${clientY - rect.top}px`);
      if (surface.id === "heroArtboard") {
        surface.style.setProperty(
          "--tilt-x",
          `${((clientY - rect.top) / rect.height - 0.5) * -7}deg`,
        );
        surface.style.setProperty(
          "--tilt-y",
          `${((clientX - rect.left) / rect.width - 0.5) * 7}deg`,
        );
      }
      frame = 0;
    });
  };
  surface.addEventListener("pointermove", updateSurface);
  if (surface.id === "heroArtboard") surface.addEventListener("pointerdown", updateSurface);
  const resetSurface = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    surface.style.setProperty("--tilt-x", "0deg");
    surface.style.setProperty("--tilt-y", "0deg");
    surface.style.removeProperty("--mouse-x");
    surface.style.removeProperty("--mouse-y");
  };
  ["pointerleave", "pointerup", "pointercancel", "lostpointercapture"].forEach(type => surface.addEventListener(type, resetSurface));
  reducedMotion.addEventListener("change", resetSurface);
});

function updatePropertiesPanel() {
  $("#propertyTool").textContent = toolNames[currentTool];
  const body = $("#propertiesBody");
  body.replaceChildren();
  if (currentTool === "brush" || currentTool === "eraser") {
    const row = document.createElement("label");
    row.className = "prop-row";
    row.htmlFor = "brushSizeInput";
    row.innerHTML = `<span>Brush size</span><span id="brushSizeReadout">${brushSize} px</span>`;
    const slider = document.createElement("input");
    Object.assign(slider, {
      type: "range",
      id: "brushSizeInput",
      min: "2",
      max: "60",
      value: String(brushSize),
      className: "prop-slider",
    });
    slider.addEventListener("input", (event) =>
      setBrushSize(event.target.value),
    );
    body.append(row, slider);
  }
  const hint = document.createElement("p");
  hint.className = "prop-hint";
  hint.textContent = toolHints[currentTool];
  body.append(hint);
}
function setTool(tool, navigate = false) {
  if (!Object.hasOwn(toolHints, tool)) return;
  commitText();
  currentTool = tool;
  const drawing = !["move", "hand", "zoom"].includes(tool);
  $$(".tool[data-tool],[data-quick-tool]").forEach((button) => {
    const active = (button.dataset.tool || button.dataset.quickTool) === tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  viewport.classList.toggle("tool-hand", tool === "hand");
  viewport.classList.toggle("tool-zoom", tool === "zoom");
  canvas.classList.toggle("drawing-tool", drawing);
  canvas.className = `${drawing ? "drawing-tool " : ""}${tool === "type" ? "cursor-text" : drawing ? "cursor-crosshair" : "cursor-default"}`;
  $("#scratchToolName").textContent = `${toolNames[tool].toUpperCase()} TOOL`;
  announce(toolHints[tool]);
  updatePropertiesPanel();
  if (navigate && drawing) navigateTo("section-scratch");
  else if (activeDrawer) closeMobilePanels();
}
$$(".tool[data-tool],[data-quick-tool]").forEach((button) =>
  button.addEventListener("click", () =>
    setTool(
      button.dataset.tool || button.dataset.quickTool,
      Boolean(button.dataset.tool),
    ),
  ),
);
function setBrushSize(value) {
  brushSize = Math.max(2, Math.min(60, Number(value) || 8));
  $("#quickBrushSize").value = brushSize;
  $("#quickBrushReadout").value = `${brushSize} px`;
  if ($("#brushSizeInput")) $("#brushSizeInput").value = brushSize;
  if ($("#brushSizeReadout"))
    $("#brushSizeReadout").textContent = `${brushSize} px`;
}
$("#quickBrushSize").addEventListener("input", (event) =>
  setBrushSize(event.target.value),
);
function setCurrentColor(hex, label, announceChange = true) {
  currentColor = hex;
  $("#swatchFg").style.background = hex;
  $("#currentColorDot").style.background = hex;
  $("#colorHex").textContent = hex.toUpperCase();
  $$(".swatch").forEach((button) => {
    const selected = button.dataset.hex.toLowerCase() === hex.toLowerCase();
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (announceChange) announce(`Drawing color: ${label || hex}`);
}
$$(".swatch").forEach((button) => {
  button.addEventListener("click", () =>
    setCurrentColor(button.dataset.hex, button.getAttribute("aria-label")),
  );
  const highlight = (active) =>
    $$(".skill-row").forEach((row) =>
      row.classList.toggle(
        "lit",
        active && row.dataset.color === button.dataset.color,
      ),
    );
  button.addEventListener("pointerenter", () => highlight(true));
  button.addEventListener("pointerleave", () => highlight(false));
  button.addEventListener("focus", () => highlight(true));
  button.addEventListener("blur", () => highlight(false));
});

// Bounded, synchronous bitmap history avoids asynchronous undo races.
const undoStates = [];
const redoStates = [];
const HISTORY_LIMIT = 16;
function snapshot() {
  return {
    pixels: ctx.getImageData(0, 0, canvas.width, canvas.height),
    hasArtwork,
  };
}
function beforeEdit() {
  undoStates.push(snapshot());
  if (undoStates.length > HISTORY_LIMIT) undoStates.shift();
  redoStates.length = 0;
}
function syncCanvasUI() {
  $("#undoBtn").disabled = undoStates.length === 0;
  $("#redoBtn").disabled = redoStates.length === 0;
  $("#scratchPlaceholder").hidden = hasArtwork || Boolean(textEditor);
}
function restoreSnapshot(state) {
  ctx.globalCompositeOperation = "source-over";
  ctx.putImageData(state.pixels, 0, 0);
  hasArtwork = state.hasArtwork;
  overlay.replaceChildren();
  syncCanvasUI();
}
function undo() {
  commitText();
  if (!undoStates.length || gesture) return;
  redoStates.push(snapshot());
  restoreSnapshot(undoStates.pop());
  announce("Undid the last drawing action.");
}
function redo() {
  if (!redoStates.length || gesture) return;
  undoStates.push(snapshot());
  restoreSnapshot(redoStates.pop());
  announce("Restored the drawing action.");
}
$("#undoBtn").addEventListener("click", undo);
$("#redoBtn").addEventListener("click", redo);
function getPos(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        canvas.width - 1,
        ((event.clientX - rect.left) * canvas.width) / rect.width,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        canvas.height - 1,
        ((event.clientY - rect.top) * canvas.height) / rect.height,
      ),
    ),
  };
}
function paint(from, to, dot = false) {
  ctx.globalCompositeOperation =
    currentTool === "eraser" ? "destination-out" : "source-over";
  ctx.fillStyle = ctx.strokeStyle = currentColor;
  // Account for rendered width, including workspace zoom.
  ctx.lineWidth =
    (brushSize * canvas.width) / canvas.getBoundingClientRect().width;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  if (dot) {
    ctx.arc(to.x, to.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
}
function drawSelection() {
  if (!gesture) return;
  const { start, last, points } = gesture;
  if (currentTool === "lasso") {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "marquee-lasso");
    path.setAttribute(
      "d",
      points
        .map((point, i) => `${i ? "L" : "M"}${point.x},${point.y}`)
        .join(" ") + " Z",
    );
    overlay.replaceChildren(path);
  } else if (currentTool === "crop") {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "marquee-rect");
    for (const [key, value] of Object.entries({
      x: Math.min(start.x, last.x),
      y: Math.min(start.y, last.y),
      width: Math.abs(last.x - start.x),
      height: Math.abs(last.y - start.y),
    }))
      rect.setAttribute(key, value);
    overlay.replaceChildren(rect);
  }
}
canvas.addEventListener("pointerdown", (event) => {
  if (
    event.button !== 0 ||
    activePointer !== null ||
    ["move", "hand", "zoom"].includes(currentTool)
  )
    return;
  event.preventDefault();
  commitText();
  const pos = getPos(event);
  if (currentTool === "type") {
    addTypeBox(pos);
    return;
  }
  if (currentTool === "eyedropper") {
    const data = ctx.getImageData(
      Math.floor(pos.x),
      Math.floor(pos.y),
      1,
      1,
    ).data;
    if (!data[3]) {
      announce("That pixel is transparent. Sample a painted area.", true);
      return;
    }
    setCurrentColor(
      "#" +
        [...data]
          .slice(0, 3)
          .map((value) => value.toString(16).padStart(2, "0"))
          .join(""),
    );
    return;
  }
  activePointer = event.pointerId;
  canvas.setPointerCapture(activePointer);
  gesture = { start: pos, last: pos, points: [pos] };
  if (currentTool === "brush" || currentTool === "eraser") {
    beforeEdit();
    paint(pos, pos, true);
    hasArtwork = true;
    syncCanvasUI();
  }
});
canvas.addEventListener("pointermove", (event) => {
  if (activePointer !== event.pointerId || !gesture) return;
  const pos = getPos(event);
  if (currentTool === "brush" || currentTool === "eraser")
    paint(gesture.last, pos);
  gesture.last = pos;
  if (currentTool === "lasso") gesture.points.push(pos);
  drawSelection();
});
function finishGesture(event, cancelled = false) {
  if (event.pointerId !== activePointer || !gesture) return;
  if (currentTool === "crop" && !cancelled) {
    const end = getPos(event);
    const x = Math.floor(Math.min(gesture.start.x, end.x));
    const y = Math.floor(Math.min(gesture.start.y, end.y));
    const width = Math.floor(Math.abs(end.x - gesture.start.x));
    const height = Math.floor(Math.abs(end.y - gesture.start.y));
    if (width > 10 && height > 10) {
      beforeEdit();
      const crop = document.createElement("canvas");
      crop.width = width;
      crop.height = height;
      crop
        .getContext("2d")
        .drawImage(canvas, x, y, width, height, 0, 0, width, height);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(crop, 0, 0, canvas.width, canvas.height);
      announce("Cropped drawing. Undo is available.");
    }
  }
  if (canvas.hasPointerCapture(activePointer))
    canvas.releasePointerCapture(activePointer);
  activePointer = null;
  gesture = null;
  ctx.globalCompositeOperation = "source-over";
  overlay.replaceChildren();
  syncCanvasUI();
}
canvas.addEventListener("pointerup", (event) => finishGesture(event));
canvas.addEventListener("pointercancel", (event) => finishGesture(event, true));
canvas.addEventListener("lostpointercapture", (event) => {
  if (gesture) finishGesture(event, true);
});
function addTypeBox(pos) {
  commitText();
  const box = document.createElement("div");
  box.className = "type-box";
  box.contentEditable = "true";
  box.setAttribute("role", "textbox");
  box.setAttribute(
    "aria-label",
    "Canvas text. Enter to place, Shift Enter for a new line, Escape to cancel.",
  );
  box.style.left = `${(pos.x / canvas.width) * 100}%`;
  box.style.top = `${(pos.y / canvas.height) * 100}%`;
  box.style.color = currentColor;
  const fontSize = (20 * canvas.width) / canvas.clientWidth;
  box.style.fontSize = "20px";
  textEditor = { box, pos, color: currentColor, fontSize };
  $("#scratchBox").append(box);
  syncCanvasUI();
  box.focus();
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      commitText(true);
      canvas.focus();
    } else if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      commitText();
      canvas.focus();
    }
  });
  box.addEventListener("paste", (event) => {
    event.preventDefault();
    // Paste plain text only, with no injected HTML/styles.
    const text = event.clipboardData?.getData("text/plain") || "";
    const selection = getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  });
  box.addEventListener("blur", () => commitText());
}
function commitText(cancel = false) {
  if (!textEditor) return;
  const { box, pos, color, fontSize } = textEditor;
  const text = box.innerText.trim();
  textEditor = null;
  if (text && !cancel) {
    beforeEdit();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px "Space Grotesk", Arial, sans-serif`;
    ctx.textBaseline = "top";
    text
      .split("\n")
      .forEach((line, index) =>
        ctx.fillText(line, pos.x, pos.y + index * fontSize * 1.2),
      );
    hasArtwork = true;
    announce("Text placed. You can erase, undo or export it.");
  }
  box.remove();
  syncCanvasUI();
}
canvas.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && currentTool === "type") {
    event.preventDefault();
    addTypeBox({ x: canvas.width * 0.2, y: canvas.height * 0.4 });
  }
});
$("#clearCanvasBtn").addEventListener("click", () => {
  commitText();
  if (!hasArtwork) return;
  beforeEdit();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  overlay.replaceChildren();
  hasArtwork = false;
  syncCanvasUI();
  announce("Canvas cleared. Undo will bring it back.", true);
});
$("#downloadCanvasBtn").addEventListener("click", () => {
  commitText();
  canvas.toBlob((blob) => {
    if (!blob) {
      announce("Unable to export. Please try again.", true);
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "my-studio-sketch.png";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    announce("Your sketch is ready as a transparent PNG.", true);
  }, "image/png");
});

// Hand and Zoom ignore links, form controls, content editing and project dialogs.
const isInteractive = (target) =>
  Boolean(
    target.closest('a,button,input,select,textarea,[contenteditable="true"]'),
  );
let pan = null;
viewport.addEventListener("pointerdown", (event) => {
  if (
    currentTool !== "hand" ||
    event.button !== 0 ||
    isInteractive(event.target)
  )
    return;
  pan = { id: event.pointerId, y: event.clientY, top: viewport.scrollTop };
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add("panning");
});
viewport.addEventListener("pointermove", (event) => {
  if (pan && event.pointerId === pan.id)
    viewport.scrollTop = pan.top - (event.clientY - pan.y);
  if (currentTool === "zoom")
    viewport.classList.toggle("zoom-out-mode", event.altKey);
});
function stopPan() {
  pan = null;
  viewport.classList.remove("panning");
}
viewport.addEventListener("pointerup", stopPan);
viewport.addEventListener("pointercancel", stopPan);
viewport.addEventListener("lostpointercapture", stopPan);
function applyZoom(value) {
  commitText();
  zoomLevel = Math.max(60, Math.min(150, value));
  pageSections.style.zoom = zoomLevel / 100;
  $("#statusZoom").textContent = `${zoomLevel}%`;
  updateScrollSpy();
}
viewport.addEventListener("click", (event) => {
  if (currentTool !== "zoom" || isInteractive(event.target)) return;
  applyZoom(zoomLevel + (event.altKey ? -10 : 10));
});
viewport.addEventListener("dblclick", (event) => {
  if (currentTool === "zoom" && !isInteractive(event.target)) applyZoom(100);
});
$("#resetZoomBtn").addEventListener("click", () => applyZoom(100));

// Shortcuts only act outside editors and form fields. Native dialog behavior wins.
document.addEventListener("keydown", (event) => {
  if (projectDialog.open) return;
  if (activeDrawer && event.key === "Escape") {
    event.preventDefault();
    closeMobilePanels();
    return;
  }
  if (activeDrawer && event.key === "Tab") {
    const focusable = $$("a,button:not(:disabled),input", activeDrawer);
    const first = focusable[0],
      last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.target.closest('input,textarea,select,[contenteditable="true"]'))
    return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    // Keep browser shortcuts native unless the playground is visible in the viewport.
    const rect = $("#section-scratch").getBoundingClientRect();
    const view = viewport.getBoundingClientRect();
    if (
      !$("#section-scratch").classList.contains("section-hidden") &&
      rect.bottom > view.top &&
      rect.top < view.bottom
    ) {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    }
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || gesture)
    return;
  const shortcuts = {
    v: "move",
    b: "brush",
    e: "eraser",
    t: "type",
    l: "lasso",
    c: "crop",
    i: "eyedropper",
    h: "hand",
    z: "zoom",
  };
  const tool = shortcuts[event.key.toLowerCase()];
  if (tool) {
    event.preventDefault();
    setTool(tool, true);
  }
});
$("#copyEmailBtn").addEventListener("click", async () => {
  const email = "khawaja1567@gmail.com";
  try {
    if (!navigator.clipboard || !window.isSecureContext)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(email);
    announce("Email address copied. Let’s make something good.", true);
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents($(".contact-primary>a").firstChild);
    selection.removeAllRanges();
    selection.addRange(range);
    announce("Email selected. Press Ctrl / ⌘ C to copy.", true);
  }
});
$("#year").textContent = new Date().getFullYear();
setTool("move");
setCurrentColor(currentColor, null, false);
syncCanvasUI();
updateScrollSpy();
if (location.hash.startsWith("#section-"))
  requestAnimationFrame(() => navigateTo(location.hash.slice(1), false));
window.addEventListener("hashchange", () =>
  navigateTo(location.hash.slice(1), false),
);
