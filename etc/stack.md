## **Backend**
- **Node.js (Alpine) + Express** → [node:20-alpine](https://hub.docker.com/_/node)
- API server: `express` with `cors`, `dotenv`, `mongodb` driver
- Internal port: `3000`

## **Web Server**
- **Nginx** → [nginx:1.27-alpine](https://hub.docker.com/_/nginx)
- Acts as reverse proxy:
  - `/` → `frontend:5173` (Vite dev server)
  - `/api/` → `api:3000`

## **Database**
- **MongoDB 7** → [mongo:7](https://hub.docker.com/_/mongo)
- Built from `database/` (Dockerfile based on `mongo:latest`) with init scripts in `/docker-entrypoint-initdb.d`
- Data persisted via named volume `mongo_data` → `/data/db`

## **Frontend**
- **React 18 + Vite 5**
- Dev server internal port: `5173`
- Nginx fronted at host `http://localhost:8080`

## **Additional Dependencies**
- `express`, `cors`, `dotenv`, `mongodb`, `react`, `react-dom`, `vite`, `@vitejs/plugin-react`

## **Container Orchestration**
- **Docker** images per service; orchestrated with **Docker Compose** (`compose.yml`)
- Service names: `mongo`, `api`, `frontend`, `nginx`