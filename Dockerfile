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
# The official nginx image is used rather than nginxinc/nginx-unprivileged, which
# lags behind nginx security releases. The steps below reproduce the unprivileged
# image's setup: no user directive, pid file and temp paths under /tmp (the only
# writable path with readOnlyRootFilesystem), port 8080, and group-writable cache
# and config directories for uid 101. Switch back once the unprivileged image
# publishes the same nginx version.
FROM nginx:1.31.9-alpine
# Also applies Alpine security updates the base image has not picked up yet
# (e.g. brotli-libs 1.2.1-r0 for CVE-2026-111497, curl, expat, libx11).
USER root
RUN apk upgrade --no-cache \
    && sed -i -e '/^user /d' -e 's,/run/nginx.pid,/tmp/nginx.pid,' \
        -e '/^http {/a proxy_temp_path /tmp/proxy_temp;' \
        -e '/^http {/a client_body_temp_path /tmp/client_temp;' \
        -e '/^http {/a fastcgi_temp_path /tmp/fastcgi_temp;' \
        -e '/^http {/a uwsgi_temp_path /tmp/uwsgi_temp;' \
        -e '/^http {/a scgi_temp_path /tmp/scgi_temp;' \
        /etc/nginx/nginx.conf \
    && sed -i 's/listen\(.*\)80;/listen\18080;/' /etc/nginx/conf.d/default.conf \
    && chown -R 101:0 /var/cache/nginx /etc/nginx/conf.d \
    && chmod -R g+w /var/cache/nginx /etc/nginx/conf.d
ENV HOME=/var/cache/nginx
EXPOSE 8080
USER 101
LABEL org.opencontainers.image.authors=asi@dbca.wa.gov.au
LABEL org.opencontainers.image.source=https://github.com/dbca-wa/plastids-of-pilbara
LABEL org.opencontainers.image.description="Plastids of the Pilbara"
LABEL org.opencontainers.image.licenses=Apache-2.0,MIT
LABEL org.opencontainers.image.title=plastidsofthepilbara
LABEL org.opencontainers.image.url="https://github.com/dbca-wa/plastids-of-pilbara"
LABEL org.opencontainers.image.version=1.0.5

COPY --from=assets /assets/ /usr/share/nginx/html/
