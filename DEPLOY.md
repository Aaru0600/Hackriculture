# Deploying HACKRICULTURE

Three services (React + nginx, Node/Express API, Python FastAPI ML) plus MongoDB.
The raw training datasets are committed, so images build from a clean clone; the
ML container trains any missing models on first start (~1 min) and caches them in
a named volume.

## Local / demo (single host)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:4000/api  (Swagger at /api/docs)
- Seeds a demo admin: `admin@hackriculture.test` / `admin1234`

## Production

```bash
# 1. Create a .env next to docker-compose.yml
cat > .env <<'EOF'
JWT_SECRET=<64+ random chars>
CORS_ORIGIN=https://your-domain
MONGO_URI=mongodb+srv://user:pass@cluster/hackriculture   # managed DB recommended
PUBLIC_API_URL=https://your-domain/api
ASSISTANT_API_KEY=                                        # optional (Groq/OpenRouter/...)
EOF

# 2. Bring it up with the prod override
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

The prod override:

- **no** host ports for `mongo` or `ml-service` (internal network only)
- `SEED_DEMO_ADMIN=false`, `DOCS_ENABLED=false`
- `NODE_ENV=production` → `JWT_SECRET` is **required** (boot fails without it)
- `restart: always`
- frontend built against `PUBLIC_API_URL`

### TLS

Terminate TLS at a load balancer / reverse proxy in front of the `frontend`
container (it listens on port 80). The API is reached same-origin via the nginx
`/api` proxy, so only one certificate is needed.

## Still recommended before heavy production traffic

| Area | Why | Suggested fix |
|---|---|---|
| Rate limiting | `express-rate-limit` uses an in-memory store — per-instance, so limits don't hold across replicas | add `rate-limit-redis` + a Redis service |
| MongoDB | bundled container has no auth/backups | use MongoDB Atlas (set `MONGO_URI`) |
| Observability | logs go to stdout only, no error tracking | add structured logging + Sentry (`SENTRY_DSN`) |
| Data providers | Open-Meteo/SoilGrids calls are un-cached; SoilGrids is rate-limited | add a short-TTL cache (Redis) in `dataProviders.js` |
| i18n | regional locale files are English placeholders | native-speaker review pass |
| Secrets | keep `JWT_SECRET` / `ASSISTANT_API_KEY` in the platform's secret manager, never in the image or a committed file |

## CI

`.github/workflows/ci.yml` runs on every push/PR: frontend lint+build, backend
`node --test`, ML train+pytest, then `docker compose build`.
