# Personal Website

**Live at [sschott20.github.io](https://sschott20.github.io/)**

Built with [Jekyll](https://jekyllrb.com/), deployed automatically by GitHub Pages on every push to `main`.

## Local development

Requires Ruby and Bundler.

```bash
bundle install
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`.

## Editing content

Pages are `index.md` and `trees.md`. The layout is in `_layouts/default.html` and the styles in `assets/style.css`.

`counter/` is a Cloudflare Worker that counts visits ([dashboard](https://site-counter.sschott20.workers.dev/)); deploy changes to it with `npx wrangler deploy`. It is not part of the Jekyll build.
