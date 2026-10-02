# forge

my personal code forge. every repo, every commit, every file.
live at [git.osiris.rocks](https://git.osiris.rocks).

static site, no backend. a build script reads my local repo checkouts and
github api metadata, then bakes everything into `data/data.json`. the
frontend is vanilla js: hash router, hand-rolled markdown renderer,
tokenizer-based syntax highlighter, fuzzy search, cmd+k palette.

## structure

```
index.html          shell: topbar, search, palette, footer
css/main.css        the whole design system
js/app.js           boot + hash router
js/store.js         data loading, search index, helpers
js/views.js         home, repo, tree, blob, commits, commit, search
js/palette.js       cmd+k fuzzy palette
js/markdown.js      markdown -> html, no deps
js/highlight.js     syntax highlighting, no deps
tools/build.py      generates data/data.json
data/data.json      generated, do not edit by hand
assets/avatar.png   profile pic
```

## rebuild the data

```bash
python3 tools/build.py
```

regenerates `data/data.json` from `~/workspace/github/*` and the github
api. run it whenever repos change, then redeploy.

## routes

- `#/` home: profile, activity heatmap, repo grid with filter/sort
- `#/r/<repo>` repo overview: readme, file tree, recent commits
- `#/r/<repo>/tree/<branch>/<path>` directory listing
- `#/r/<repo>/blob/<branch>/<path>` file viewer with syntax highlighting
- `#/r/<repo>/commits` full commit history
- `#/r/<repo>/commit/<sha>` commit detail with per-file stats
- `#/search/<q>` search repos and files

## deploy

push to main, vercel picks it up. custom domain `git.osiris.rocks`
is assigned in the vercel dashboard.
