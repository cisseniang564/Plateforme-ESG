# ──────────────────────────────────────────────────────────────
# Stage 1 — Build React / Vite
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# URL relative → nginx proxie /api/ vers le backend (fonctionne quel que soit le domaine)
RUN echo "VITE_API_URL=/api/v1" > .env.production
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2 — Serve with Nginx
# ──────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
