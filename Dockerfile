# CareBridge UAE — single-image deploy (frontend + backend).
# Stage 1 builds the Vite frontend; stage 2 runs FastAPI, which serves both the
# API (/api/*) and the built static site (same origin, no CORS to configure).

# --- Stage 1: build the frontend ---
FROM node:20-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend + static assets ---
FROM python:3.12-slim
WORKDIR /app

COPY backend/ /app/backend/
RUN pip install --no-cache-dir -r /app/backend/server/requirements.txt

# Built frontend goes where main.py looks for it.
COPY --from=web /web/dist /app/backend/server/static

WORKDIR /app/backend/server
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
