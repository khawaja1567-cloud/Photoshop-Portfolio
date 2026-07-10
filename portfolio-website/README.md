# Khawaja Jawad Ahmed — Portfolio

A Photoshop-interface-inspired portfolio site: left toolbar acts as navigation, right side has a Swatches panel (skills) and a Layers panel (projects), and the canvas area shows the active section.

Plain HTML/CSS/JS — no build step, no dependencies.

## Files

```
portfolio-website/
├── index.html   → structure & content
├── style.css    → theme, layout, responsive rules
└── script.js    → tool/tab switching, swatches, layers, mobile panels
```

## Run locally

Just open `index.html` in a browser, or serve it so relative paths behave normally:

```bash
npx serve .
```

## Push to GitHub (from VS Code)

1. Unzip this folder and open it in VS Code.
2. Open the built-in terminal (`` Ctrl+` ``) and run:
   ```bash
   git init
   git add .
   git commit -m "Initial portfolio"
   ```
3. Create a new empty repo on GitHub (no README/license, so it stays empty), then:
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```

## Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import the GitHub repo you just pushed.
3. Framework preset: **Other** (it's static — no build command or output directory needed).
4. Click **Deploy**.

Vercel will serve `index.html` as-is. Any time you push to `main`, it redeploys automatically.

## Editing content

- All text content lives in `index.html`, inside the five `<section class="canvas-section">` blocks (About, Work, Skills, Resume, Contact).
- Colors, fonts, and spacing are driven by CSS variables at the top of `style.css` (`:root { ... }`) — change `--accent` there to reset the default brand color.
- Behavior (tool switching, swatch clicks, layer toggles, mobile drawers) lives in `script.js`.

## Next steps

This is the interface shell — every tool, tab, swatch, and layer is already wired to something reasonable (switch sections, recolor the accent, show/hide project cards). Let me know the specific behavior you want for each component and I'll wire it up to match.
