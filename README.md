# Kalpa Das – 3D Scroll Portfolio 

A pencil-sketch 3D meadow (Three.js) sits behind the page. As you scroll, the camera
moves through the meadow, a bee flies ahead, and at the end it dances in front of the hive.
Your story appears on cards in front. After the story, normal sections follow
(projects, experience, pricing, contact).

Plain HTML + CSS + JavaScript. No npm, no build step. Three.js is included in `js/three.min.js`.

## What you need
- A modern browser (Chrome, Edge, Firefox, Safari) with WebGL (all current ones have it)
- Internet (only for icons and Google Fonts; the 3D scene itself works offline)
- Optional: Python 3 or VS Code for a local server

## Run it
**Quickest:** unzip and double-click `index.html`.

**Recommended (local server):**
```
cd kalpa-portfolio
python -m http.server 8000     # Mac/Linux: python3
```
Open http://localhost:8000

**VS Code:** install "Live Server", right-click `index.html` → Open with Live Server.

## Edit
- Story cards (the text you see while scrolling): `CHAPTERS` at the top of `js/main.js`
- Projects, tech logos, form URL: top of `js/main.js`
- Other text: `index.html`
- Colours: CSS variables at the top of `css/style.css`
- 3D scene (flowers, bee, hive, camera path): `js/scene.js`
- Scroll length of the story: `#story{height:560vh}` in `css/style.css`

## Deploy free (GitHub Pages)
1. Replace the files in your `portfolio-kalpa-das` repo with these (keep `images`).
2. Commit and push.
3. Settings → Pages → Branch `master` / root → Save.
