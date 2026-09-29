# Khawaja Jawad Ahmed — Designer Workspace

A Photoshop-inspired portfolio with an interactive glass workspace. Built with plain HTML, CSS and JavaScript; no build step or production dependencies.

## Run locally

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. You can also open `index.html` directly; clipboard and preference storage availability depend on browser permissions.

## The experience

- A translucent studio shell with real `backdrop-filter` blur, edge highlights, layered typography and subtle pointer lighting.
- Sage, Violet and Blue workspace palettes, plus an adjustable glass-frost control. Only these preferences are saved locally. Drawing colors never change interface contrast.
- Project filters and accessible project dialogs. The five project briefs come from the existing portfolio. The CSS typographic covers are labeled as previews, not actual project screenshots.
- Layer navigation with scroll highlighting, section visibility toggles and direct section links. Navigation restores a hidden section; the last visible section cannot be hidden.
- A drawing playground with brush, eraser, type, eyedropper, crop and a visual lasso preview, plus 16-step undo/redo and transparent PNG export.
- Native dialog keyboard behavior, labeled controls, visible focus rings, mobile drawers with focus management, reduced-motion support and opaque fallbacks for unsupported backdrop blur.

## Playground tools

| Key | Tool       | Behavior                                                                          |
| --- | ---------- | --------------------------------------------------------------------------------- |
| V   | Move       | Normal portfolio browsing                                                         |
| B   | Brush      | Draw, including a single-click dot                                                |
| E   | Eraser     | Erase painted pixels                                                              |
| T   | Type       | Click to type; Enter places, Shift+Enter adds a line, Escape cancels              |
| I   | Eyedropper | Sample a painted pixel without changing the interface palette                     |
| L   | Lasso      | Preview a selection outline; it does not mask edits                               |
| C   | Crop       | Drag a rectangle to crop and scale it to the drawing area                         |
| H   | Hand       | Drag non-interactive page space to scroll                                         |
| Z   | Zoom       | Click non-interactive space to zoom; Alt-click to zoom out; double-click to reset |

Shortcuts do not intercept typing in inputs or editors. Ctrl/Command+Z and Ctrl/Command+Shift+Z undo/redo while the playground is in view. The canvas can also receive keyboard focus: choose Type, focus it and press Enter to place text in the center area.

The stable 1200×650 bitmap survives viewport resizing and workspace zoom. Pointer positions map to the bitmap at every zoom level. Placed text becomes part of the image, so it can be erased, cropped, undone and exported. Drawing history exists only in the current tab; save a PNG before reloading.

## Edit content

- `index.html`: biography, five project briefs and cover markup, skills, experience, contact details and six page sections.
- `style.css`: design tokens, artwork, glass surfaces and responsive layouts. The `@supports` and reduced-transparency rules provide solid surfaces where required.
- `script.js`: palette settings, navigation, project dialogs, drawing tools, keyboard shortcuts and mobile drawers.

To replace a typographic project cover with a real asset, replace that card's `.project-art` contents with an image and style it to fit. Keep the `.project-art` wrapper: the project dialog clones that element. Update the preview labels when actual artwork is available.

Google Fonts is optional; local system font fallbacks keep the site usable offline. Email and phone links, LinkedIn and Behance retain the original portfolio destinations. The copy-email action uses the Clipboard API on secure origins, with a text-selection fallback.

## Hosting

This is a static site. Serve the repository root with your existing host; no build command is required. Use your host's branch preview or merge the reviewed branch into the configured production branch to publish. This repository's default branch is `master`.

## Review checklist

1. Check the home screen, all six sections and project cards at desktop and phone widths.
2. Filter work, open a project and close it with Escape; focus should return to its card.
3. Change themes and frost, then reload; the mood should persist.
4. Hide and restore a layer; navigate to a hidden layer from the top menu.
5. Draw, erase, type, sample, crop, undo/redo, resize, zoom and export.
6. On mobile, open each drawer, use Tab/Shift+Tab, select a tool or section and close with Escape.
7. With reduced motion enabled, verify that ambient drift and hover tilt are disabled.
