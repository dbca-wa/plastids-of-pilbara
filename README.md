# Plastids of the Pilbara

An interactive web page presenting plastid (chloroplast genome) sequence data and
phylogenetic trees for plant species of the Pilbara region of Western Australia.

This project is a static website served by nginx. There's no build step: the HTML
pages load their JavaScript and CSS with plain `<script>` and `<link>` tags, so a
fresh clone runs as-is.

## Development

Use Python to serve the site locally:

```bash
python -m http.server 8080
```

(http://localhost:8080)

The pages reference their assets with relative paths, so any static file server
works. There is no bundler and no RequireJS/AMD loader - every library is a plain
`<script src="js/...">` tag that resolves to a file committed in the repo.

## Dependencies

Two browser libraries are managed with [bun](https://bun.sh/) and committed as
minified files in `js/`, so a clone runs without bun and version changes show up as
diffs in review:

- `js/jquery.min.js` - jQuery 3.7.1 (`jquery ^3.7.1`)
- `js/fabric.min.js` - Fabric.js 5.x (`fabric ^5.3.0`)

`scripts/sync-deps.sh` copies them out of `node_modules/` into the exact paths the
HTML `<script src="...">` tags expect. Because the site uses plain script tags, the
files must stay at `js/jquery.min.js` and `js/fabric.min.js` - don't move them into a
`js/lib/` directory.

```bash
bun install          # first time only
bun run deps:update  # bun update, then copy the files into place
```

Check the site in a browser, then commit `package.json`, `bun.lock` and the changed
files under `js/`.

Use `bun run deps:check` to see what's available, or `bun run deps:sync` to re-copy
without changing versions. If a library moves its files around, the sync exits with
an error naming the missing path; update the paths in the script when that happens.

jquery and fabric are intentionally held on their current majors (`^3.7.1` /
`^5.3.0`). Moving to jQuery 4 or Fabric 6 is a breaking change for this site's code
and is not done automatically.

Dependabot only updates `package.json` and `bun.lock` and can't run the copy script,
so its PRs leave the files in `js/` untouched. Run `bun install && bun run deps:sync`
and commit the resulting `js/jquery.min.js` / `js/fabric.min.js` changes onto the same
branch before merging.

### Libraries maintained by hand

These aren't on npm, so the sync leaves them alone:

- `js/skel.min.js`, `js/skel-layers.min.js` - the skel responsive framework
- `js/html5shiv.js`
- `css/font-awesome.min.css`, `css/skel.css`

The project's own JavaScript (`js/pilbara_*.js`, `js/component_*.js`, `js/colormap.js`,
`js/events_simple.js`, `js/init.js`, `js/linker.js`, `js/tree_utils.js`) is source
code, not a dependency, and is edited directly.

## Docker

Two stages: an Alpine stage collects only the files that should be served into a
clean `/assets` directory, then nginx serves them on port 8080. Repo metadata
(`Dockerfile`, `.github/`, `kustomize/`, `scripts/`, `node_modules/`, `package.json`,
`bun.lock`, `README.md`) never reaches the webroot.

```bash
docker build -t plastids-of-pilbara:local .
docker run --rm -p 8080:8080 plastids-of-pilbara:local
```
