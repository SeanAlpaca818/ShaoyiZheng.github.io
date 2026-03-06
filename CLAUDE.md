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

The site currently uses only the **publications** collection (defined in `_config.yml` under `collections:`). Other template collections (talks, teaching, portfolio) are not active in navigation.

**Active content locations:**
- `_pages/about.md` — homepage (permalink `/`), contains research intro
- `_pages/cv.md` — CV page with education, projects, industry experience, skills
- `_publications/` — academic papers with front matter: `title`, `collection`, `category` (books/manuscripts/conferences), `permalink`, `excerpt`, `date`, `venue`, `citation`
- `_data/navigation.yml` — top nav bar (currently: Publications, CV)

**Key configuration:**
- `_config.yml` — site metadata, author sidebar info (name, bio, email, Google Scholar, LinkedIn, GitHub), collection definitions, plugins
- `_config_docker.yml` — overrides `url` to empty for local Docker use

**Theme & layout:**
- `_layouts/` — HTML templates (`default.html` base, `single.html`, `archive.html`, `talk.html`)
- `_includes/` — reusable HTML partials (author profile sidebar, SEO, analytics, etc.)
- `_sass/` — SCSS stylesheets, theme set via `site_theme` in config ("default" or "air")

**Utilities:**
- `markdown_generator/` — Python scripts and Jupyter notebooks to batch-generate publication/talk Markdown from TSV/BibTeX
- `files/` — static assets (PDFs, etc.), accessible at `/files/filename`
- `images/` — site images including profile photo (`Shaoyi_profile.png`)

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
