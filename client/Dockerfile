# ========================================================
# Stage 1: Build React SPA using Vite & Node 22
# ========================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi \
    && npm ci

# Copy application source
COPY . .

# Separate production portal links; empty defaults retain local development routes.
ARG VITE_PATIENT_URL=
ARG VITE_CLINIC_URL=
ENV VITE_PATIENT_URL=$VITE_PATIENT_URL VITE_CLINIC_URL=$VITE_CLINIC_URL

# Build production assets
RUN npm run build

# ========================================================
# Stage 2: Serve production assets via Nginx Alpine
# ========================================================
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-portals/ /etc/nginx/portals/

# Expose HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

