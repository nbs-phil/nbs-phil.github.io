# Nathaniel — Academic Portfolio

One-page academic portfolio. **All live content is in `content.yaml`** — the page renders from that file automatically.

> **Note:** `content.md` is a draft/reference file only. The site does not read it.

## Quick start

```bash
cd /Users/haneenmo/Nathaniel
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). After editing, hard-refresh (`Cmd+Shift+R`).

## File map

| File | Purpose |
|------|---------|
| `content.yaml` | **Edit this** — bio, projects, papers, images |
| `assets/images/` | Illustration files (PNG/JPG; not PDF) |
| `js/render.js` | Builds HTML from YAML; comments explain data flow |
| `css/style.css` | Layout and typography |
| `index.html` | Page shell (rarely needs editing) |

## Edit content

See the comment block at the top of `content.yaml` for the full schema.

### Add a project

Copy an existing project block under `projects:` and change the fields.

### Add a paper

```yaml
- title: Paper Title
  venue: Journal Name, 2024   # optional
  link: https://...           # optional — omit if no link yet
  abstract: |
    Paper abstract text here.
```

### Add figure(s)

Figures appear in the **right column**, stacked top to bottom.

**One figure** — use `figure:`:

```yaml
figure:
  src: assets/images/example.png
  alt: Description for screen readers
  caption: Figure 1. Caption text here.
```

**Multiple figures** — use `figures:` (do **not** repeat `figure:` keys):

```yaml
figures:
  - src: assets/images/a.png
    alt: First diagram
    caption: Figure 2. ...
  - src: assets/images/b.png
    alt: Second diagram
    caption: Figure 3. ...
```

Paper-level `figure` / `figures` also render in the same column, after project figures.
