# Personal Website

Source for my personal website. Built with [Jekyll](https://jekyllrb.com/) and deployed via GitHub Pages.

## Local development

Requires Ruby and Bundler.

```bash
bundle install
bundle exec jekyll serve
```

The site will be available at `http://localhost:4000`.

## Deploying to GitHub Pages

1. Create a repository on GitHub. Two options:
   - **User site** (recommended): name it `sschott20.github.io`. The site will live at `https://sschott20.github.io`.
   - **Project site**: any name. The site lives at `https://sschott20.github.io/<repo-name>/`. If you go this route, set `baseurl: "/<repo-name>"` in `_config.yml`.

2. Push the repo:

   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin git@github.com:sschott20/<repo-name>.git
   git push -u origin main
   ```

3. In the repository settings, go to **Pages** and set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`. GitHub Pages will build the Jekyll site automatically.

## Editing content

Everything is in `index.md`. The layout is in `_layouts/default.html` and the styles in `assets/style.css`.
