# syntax=docker/dockerfile:1

# Stage 1: Assemble only the web-servable files into a clean directory, so repo
# metadata (Dockerfile, .github, kustomize, scripts, node_modules, package.json,
# bun.lock, README) can't end up in the webroot whatever .dockerignore says. The
# site loads its libraries with plain <script> tags, so js/ and css/ are the
# vendored files committed in the repo - there's no build or bundling step.
FROM alpine:3.24 AS assets
WORKDIR /assets
# Root HTML pages.
COPY data_explorer.html .
COPY images.html .
COPY index.html .
COPY learn_more.html .
COPY sequence_search.html .
COPY test.html .
COPY tree.html .
COPY license.txt .
# Asset directories.
COPY css/ ./css/
COPY js/ ./js/
COPY data/ ./data/
COPY fonts/ ./fonts/
COPY html/ ./html/
COPY images/ ./images/

# Stage 2: Production nginx image with only the web assets.
FROM nginxinc/nginx-unprivileged:1.31.3-alpine
LABEL org.opencontainers.image.authors=asi@dbca.wa.gov.au
LABEL org.opencontainers.image.source=https://github.com/dbca-wa/plastids-of-pilbara
LABEL org.opencontainers.image.description="Plastids of the Pilbara"
LABEL org.opencontainers.image.licenses=Apache-2.0,MIT
LABEL org.opencontainers.image.title=plastidsofthepilbara
LABEL org.opencontainers.image.url="https://github.com/dbca-wa/plastids-of-pilbara"
LABEL org.opencontainers.image.version=1.0.3

COPY --from=assets /assets/ /usr/share/nginx/html/
