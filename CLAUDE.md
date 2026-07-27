# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Shaoyi (Sean) Zheng's academic personal website built with Jekyll using the [Academic Pages](https://github.com/academicpages/academicpages.github.io) template (forked from Minimal Mistakes). Hosted on GitHub Pages at `https://www.shaoyizheng.me` (custom domain via CNAME).

## Branching

- **`dev`** — the live branch. GitHub Pages builds the site from `dev` (verify with `gh api repos/OWNER/REPO/pages`), so **pushing to `dev` deploys to https://www.shaoyizheng.me**. All work happens here.
- **`master`** — GitHub's *default* branch, but not what Pages serves. It holds an older state of the upstream template and is not part of the deploy path. Do not merge `dev` into it expecting a deploy.

Check a deploy with `gh api repos/OWNER/REPO/pages/builds --jq '.[0]'`.

## Development Commands

```bash
# Install dependencies
bundle install

# Serve locally (auto-rebuilds on Markdown/HTML changes; restart for _config.yml changes)
bundle exec jekyll serve -l -H localhost
# Site available at localhost:4000

# Docker alternative
docker compose up
# Site available at localhost:4000

# Build JS assets (rarely needed)
npm run build:js
```

## Architecture

The site uses only the **publications** collection (defined in `_config.yml` under `collections:`). Other template collections (talks, teaching, portfolio) are not active in navigation.

**Active content (everything else in `_pages/` is built but not linked from nav):**
- `_pages/about.md` — homepage (permalink `/`), `layout: home`, research intro
- `_pages/cv.html` — CV page (education, projects, industry experience, skills)
- `_pages/publications.html` — publications list, grouped by year, each row linking straight to arXiv
- `_pages/interests.html` — Interests page with photography carousel
- `_publications/` — academic papers; see "Adding a New Publication" below
- `_data/navigation.yml` — top nav (Publications, CV, Interests)
- `_data/photography.yml` — photo entries with EXIF metadata (camera, location, date, focal, ISO, shutter); rendered via `_includes/photo-carousel.html`

**Key configuration:**
- `_config.yml` — site metadata, author sidebar info, collection definitions, plugins. `site_theme` picks the SCSS theme family ("default" or "air"); `color_mode` picks light or dark (see Color system).
- `_config_docker.yml` — overrides `url` to empty for local Docker use
- `CNAME` — custom domain `www.shaoyizheng.me`

**Theme & layout:**
- `_layouts/` — HTML templates (`default.html` base, `single.html`, `archive.html`, `home.html`, etc.)
- `_includes/` — reusable HTML partials. Custom override slots: `head/custom.html`, `footer/custom.html` (see Custom Features).
- `_sass/` — SCSS stylesheets. Custom partials include `_design-system.scss`, `_home.scss`, `_global-theme.scss`.

**Utilities:**
- `markdown_generator/` — Python scripts and Jupyter notebooks to batch-generate publication/talk Markdown from TSV/BibTeX
- `files/` — static assets (PDFs, etc.), accessible at `/files/filename`
- `images/` — site images. `images/photography/` holds the carousel photos referenced by `_data/photography.yml`.

## Custom Features (beyond upstream Academic Pages)

The template has been extended with several custom client-side features. Touch these carefully — they interact across `_includes/head/custom.html`, `_includes/footer/custom.html`, `assets/js/`, and `_sass/`.

**Color system (pure CSS — no JavaScript):**
- Greyscale base with a single accent hue, `#A7C1D9` (hsl 209 40% 75%). The former 19-color auto-cycling palette, its click-to-change button, and `assets/js/color-picker.js` have all been removed.
- All colors are CSS custom properties declared in two places: `_sass/layout/_home.scss` (`--home-*`) and `_sass/layout/_global-theme.scss` (`--global-*`, `--gt-*`). Each file defines a `:root` block (light) and an `html[data-theme="dark"]` block (dark).
- **The accent is split in two, and this matters:** `#A7C1D9` scores only 1.9:1 on white (WCAG AA needs 4.5:1) but 10.6:1 on the near-black hero. So:
  - `--home-accent` is text-safe — `#365A7D` in light mode (7.2:1 on white), `#A7C1D9` in dark. Use for anything carrying text.
  - `--home-accent-soft` is the raw tint, **decorative only** — section-title rules, year rules, glows, icon backgrounds. Never put text in it on a light background.
  - `--home-hero-accent` is for the hero, which is near-black in *both* themes, so it stays `#A7C1D9` regardless.
- **Light/dark toggle** (moon/sun button in the masthead, `assets/js/theme-toggle.js`): flips `data-theme` on `<html>` and stores the choice in `localStorage` under `color-mode`.
  - `color_mode` in `_config.yml` (`"light"` | `"dark"`) is only the **default** for visitors with no stored choice. It is separate from `site_theme`, which picks the SCSS partial family (`default` / `air`) — setting `site_theme: "dark"` would break the `@import` in `assets/css/main.scss`.
  - The initial value is resolved by an inline script in `_includes/head/custom.html`. It must stay **synchronous and in `<head>`** or the page flashes the config default before the stored choice applies. Do not move it to an external file.
- The hero follows the theme (white in light mode, near-black in dark), so `--home-hero-accent` is text-safe in each mode rather than fixed.
- Residual color from upstream that is *not* part of this system: Solarized syntax highlighting (`_sass/_syntax.scss`) and social-brand icon colors.

**Wave canvas (`assets/js/waves.js`):**
- Custom `<a-waves>` Web Component with Perlin-noise lines, mouse/touch interaction, IntersectionObserver to pause off-screen
- Used as the homepage and inner-page hero background
- Style is driven by CSS custom properties, re-read via a `MutationObserver` on `data-theme` so the canvas re-tunes when the theme flips:
  `--wave-color`, `--wave-line-width`, `--wave-gap-scale` (multiplies the base gap from `data-lines`; bigger = fewer lines). Light mode gets thin dense dark lines on white; dark mode gets thicker sparser white lines on black.
- A `data-color` attribute on the element still overrides `--wave-color`. Changing `--wave-gap-scale` rebuilds the line geometry.

**Homepage + inner-page JS:**
- `assets/js/home.js` — typing effect (cycling keywords) and `.reveal` scroll animations; loaded only on `layout: home`
- `assets/js/inner-pages.js` — scroll-reveal + smooth scroll; loaded on `layout: cv | publications`
- Layout-conditional loading is wired in `_includes/footer/custom.html`

**Photography carousel:**
- `_pages/interests.html` renders `_includes/photo-carousel.html`, which iterates `_data/photography.yml`
- Carousel JS is inlined in `_includes/footer/custom.html` (auto-advance, pause-on-hover); styles in `_sass/layout/_home.scss` under `.carousel__*` and `.photo-layout__*`
- To add a photo: drop the file in `images/photography/` and append an entry to `_data/photography.yml` with the EXIF fields used by existing entries

**Other head/footer customizations:**
- `_includes/head/custom.html` — Academicons CSS, favicon suite (SVG/PNG/manifest), and a tiny script that clears the retired color-cycle keys from returning visitors' localStorage
- `_includes/footer/custom.html` — MathJax, Plotly, Mermaid, plus the JS loaders above

**JS asset build:** `npm run build:js` rebuilds the bundled `assets/js/main.min.js` from the upstream template's source modules. Custom JS (`waves.js`, `home.js`, `inner-pages.js`) is loaded directly and is **not** part of that bundle — edits to those files take effect on Jekyll reload without `npm run build:js`.

## Adding a New Publication

Publications have **no individual pages** — the collection is `output: false` in `_config.yml`, and each entry on `/publications/` links straight to its arXiv page. `arxiv` is therefore required; without it the row renders as a dead link.

Create `_publications/YYYY-MM-DD-slug.md` following existing files:

```yaml
---
title: "Paper Title"
collection: publications
category: conferences  # or: manuscripts, books
excerpt: 'One-line summary.'
date: YYYY-MM-DD
venue: 'ICML 2026'                           # conference + year only, no page/volume info
year: "2026"                                 # required — which year heading it files under
arxiv: "https://arxiv.org/abs/XXXX.XXXXX"   # required — the click target
authors: "First Author, Second Author"       # "Shaoyi Zheng" is auto-bolded + underlined
citation: 'Author(s). "Title." <i>Venue</i>.'
---
```

The list is grouped under year headings taken from `year`, **not** from `date` — a paper's venue year can differ from its arXiv date (HilbertA was posted in 2025 but is ICML 2026). `date` still controls ordering within a group. `venue` should be just the conference and year.

Only `title`, `venue`, `year`, `authors`, and `arxiv` are rendered on `/publications/`. The body text, `excerpt`, `citation`, and `tags` are currently unused — kept for reference and for a possible future detail view.
