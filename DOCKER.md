# swaBackend - Docker

## Image

`swa-backend` — Node.js 20 Alpine Express API on port 5000.

## Build

```bash
docker build -t swa-backend ./swaBackend
```

## Run

Requires a MongoDB instance. Connect via Docker network:

```bash
docker network create swa-net
docker run -d --name swa-db --network swa-net mongo:7
docker run -d --name swa-backend \
  --network swa-net \
  -p 5000:5000 \
  --env-file ./swaBackend/.env \
  swa-backend
```

### Environment variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | `mongodb://swa-db:27017/swa-db` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret for JWT signing |
| `NODE_ENV` | `development` | Environment mode |
| `SMTP_HOST` | — | Email SMTP host |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_EMAIL` | — | SMTP login email |
| `SMTP_PASSWORD` | — | SMTP password |

## Seed Data

Run inside the running container:

```bash
docker exec -it swa-backend node src/scripts/seedHierarchy.js
```

## Health Check

```bash
curl http://localhost:5000/api/health
```
