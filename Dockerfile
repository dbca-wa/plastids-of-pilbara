# syntax=docker/dockerfile:1
FROM nginxinc/nginx-unprivileged:stable-alpine

# Labels for container metadata
LABEL org.opencontainers.image.authors="asi@dbca.wa.gov.au"
LABEL org.opencontainers.image.source="https://github.com/dbca-wa/plastids-of-pilbara"
LABEL org.opencontainers.image.description="Plastids of the Pilbara - Chloroplast genome database"
LABEL org.opencontainers.image.licenses="Apache-2.0,MIT"
LABEL org.opencontainers.image.title="plastids-of-pilbara"
LABEL org.opencontainers.image.url="https://github.com/dbca-wa/plastids-of-pilbara"
LABEL org.opencontainers.image.version="2.0.0"

# Install curl for downloading updated jQuery (security fix)
USER root
RUN apk add --no-cache curl

# Create a script to update jQuery to latest secure version
RUN echo '#!/bin/sh' > /tmp/update-jquery.sh && \
    echo 'curl -s -o /usr/share/nginx/html/js/jquery.min.js https://code.jquery.com/jquery-3.7.1.min.js' >> /tmp/update-jquery.sh && \
    chmod +x /tmp/update-jquery.sh

# Copy application files
COPY . /usr/share/nginx/html

# Update jQuery to secure version (fixes XSS vulnerabilities)
RUN /tmp/update-jquery.sh && rm /tmp/update-jquery.sh

# Copy custom nginx configuration with security headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Remove curl (for security)
RUN apk del curl

# Switch back to unprivileged user
USER nginx

# Expose port 8080 (nginx-unprivileged default)
EXPOSE 8080