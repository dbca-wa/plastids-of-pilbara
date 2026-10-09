#!/usr/bin/env bash
#
# Copies the browser libraries out of node_modules/ into the paths the HTML
# <script src="..."> tags expect. Run after bun install or bun update.
#
#   bun run deps:sync
#
# This site loads libraries with plain <script> tags (no RequireJS/AMD), so the
# files must land at the exact paths the HTML references: js/jquery.min.js and
# js/fabric.min.js. Don't move them into a js/lib/ directory.
#
# Exits non-zero if a source file is missing, so a package changing its layout
# fails here instead of shipping a broken app.
#
# These libraries aren't on npm (or are vendored by hand) and are left alone:
#   js/skel.min.js, js/skel-layers.min.js, js/html5shiv.js   not published
#   css/font-awesome.min.css, css/skel.css                   not published
#   js/pilbara_*.js, js/component_*.js, js/colormap.js,       project-own code
#   js/events_simple.js, js/init.js, js/linker.js, js/tree_utils.js
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NM="$ROOT/node_modules"

copied=0
errors=0

copy_file() {
	local src="$NM/$1" dest="$ROOT/$2"

	if [ ! -f "$src" ]; then
		echo "  missing: node_modules/$1" >&2
		errors=$((errors + 1))
		return
	fi

	mkdir -p "$(dirname "$dest")"
	cp "$src" "$dest"
	echo "  $2"
	copied=$((copied + 1))
}

if [ ! -d "$NM" ]; then
	echo "node_modules/ not found - run 'bun install' first" >&2
	exit 1
fi

echo "Syncing from node_modules/"

copy_file "jquery/dist/jquery.min.js" "js/jquery.min.js"
copy_file "fabric/dist/fabric.min.js" "js/fabric.min.js"

if [ "$errors" -gt 0 ]; then
	echo "Failed: $errors source path(s) not found. Check node_modules/ and update the paths above." >&2
	exit 1
fi

echo "Done - $copied copied."
