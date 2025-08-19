# syntax=docker/dockerfile:1
FROM nginxinc/nginx-unprivileged:stable-alpine
LABEL org.opencontainers.image.authors=asi@dbca.wa.gov.au
LABEL org.opencontainers.image.source=https://github.com/dbca-wa/plastids-of-pilbara
LABEL org.opencontainers.image.description="Plastids of the Pilbara"
LABEL org.opencontainers.image.licenses=Apache-2.0,MIT
LABEL org.opencontainers.image.title=plastidsofthepilbara
LABEL org.opencontainers.image.url="https://github.com/dbca-wa/plastids-of-pilbara"
LABEL org.opencontainers.image.version=1.0.2

COPY . /usr/share/nginx/html
