# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Shaoyi (Sean) Zheng's academic personal website built with Jekyll using the [Academic Pages](https://github.com/academicpages/academicpages.github.io) template (forked from Minimal Mistakes). Hosted on GitHub Pages at `https://www.shaoyizheng.me` (custom domain via CNAME).

## Branching

- **`master`** — production branch, deployed to GitHub Pages. Contains the upstream template with minimal customization.
- **`dev`** — development branch with all personal content (publications, CV, about page). Work here and merge to `master` to deploy.

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
- `_pages/publications.html` — publications archive
- `_pages/interests.html` — Interests page with photography carousel
- `_publications/` — academic papers; see "Adding a New Publication" below
- `_data/navigation.yml` — top nav (Publications, CV, Interests)
- `_data/photography.yml` — photo entries with EXIF metadata (camera, location, date, focal, ISO, shutter); rendered via `_includes/photo-carousel.html`

**Key configuration:**
- `_config.yml` — site metadata, author sidebar info, collection definitions, plugins. `site_theme` controls SCSS theme ("default" or "air").
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

**Color system (`assets/js/color-picker.js` + critical inline script in `_includes/head/custom.html`):**
- 19-color palette auto-cycles every ~10s; user clicks to jump; choice persisted in localStorage
- Palette data and the init code that sets CSS custom properties (`--home-accent`, `--gt-accent`, `--home-hero-bg`, `--home-section-bg`, timeline/card colors) are **inlined in `<head>`** to avoid white-flash on first paint. Do not move this to an external file.
- HSL interpolation, ~2s fade transitions

**Wave canvas (`assets/js/waves.js`):**
- Custom `<a-waves>` Web Component with Perlin-noise lines, mouse/touch interaction, IntersectionObserver to pause off-screen
- Used as the inner-page hero background

**Homepage + inner-page JS:**
- `assets/js/home.js` — typing effect (cycling keywords) and `.reveal` scroll animations; loaded only on `layout: home`
- `assets/js/inner-pages.js` — scroll-reveal + smooth scroll; loaded on `layout: cv | publications | publication`
- Layout-conditional loading is wired in `_includes/footer/custom.html`

**Photography carousel:**
- `_pages/interests.html` renders `_includes/photo-carousel.html`, which iterates `_data/photography.yml`
- Carousel JS is inlined in `_includes/footer/custom.html` (auto-advance, pause-on-hover); styles in `_sass/layout/_home.scss` under `.carousel__*` and `.photo-layout__*`
- To add a photo: drop the file in `images/photography/` and append an entry to `_data/photography.yml` with the EXIF fields used by existing entries

**Other head/footer customizations:**
- `_includes/head/custom.html` — Academicons CSS, favicon suite (SVG/PNG/manifest), the critical color-picker inline script
- `_includes/footer/custom.html` — MathJax, Plotly, Mermaid, plus the JS loaders above

**JS asset build:** `npm run build:js` rebuilds the bundled `assets/js/main.min.js` from the upstream template's source modules. Custom JS (`color-picker.js`, `waves.js`, `home.js`, `inner-pages.js`) is loaded directly and is **not** part of that bundle — edits to those files take effect on Jekyll reload without `npm run build:js`.

## Adding a New Publication

Create `_publications/YYYY-MM-DD-slug.md` following existing files. Required front matter:

```yaml
---
title: "Paper Title"
collection: publications
category: conferences  # or: manuscripts, books
permalink: /publication/YYYY-MM-DD-slug
excerpt: 'One-line summary.'
date: YYYY-MM-DD
venue: 'Conference/Journal Name'
citation: 'Author(s). "Title." <i>Venue</i>.'
---
```
