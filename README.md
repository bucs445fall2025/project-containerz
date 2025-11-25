# FinWiz
## CS 445 Final Project
### Fall, 2025

### Team: Containzerz
Samuel Montes, Fernando Oliveira

## Overview
FinWiz simplifies personal finance management by aggregating bank, card, and investment accounts and pairing them with lightweight analytics. Users can link accounts via Plaid, view spending and investment holdings in one dashboard, and run Monte Carlo simulations to understand risk/return scenarios. The app targets young adults who want clear visibility into their money plus gentle nudges toward better saving and investing habits.

## Architecture
- **Frontend (`src/frontend`)**: React 18 + Vite with protected routes for login/register, Plaid Link for account connections, and dashboards for cash flow and investments.
- **Backend (`src/backend`)**: Express API with JWT auth, encrypted Plaid data storage in MongoDB, email-based verification/reset flows, and routes for transactions/investments plus quant endpoints.
- **Quant service (`src/pythonservice`)**: FastAPI service that runs Monte Carlo simulations for assets and portfolios.
- **Reverse proxy (`src/nginx`)**: Nginx fronts the Vite dev server and API for a single entry point.
- **Orchestration**: `src/compose.yml` wires the services together; supply your own MongoDB connection string (local or hosted).

## Prerequisites
- Docker + Docker Compose v2
- Node.js 20+ (only needed if running services outside Docker)
- Python 3.11+ (only if running the quant service outside Docker)
- MongoDB 7+ connection string (Atlas or local)
- Plaid Sandbox client ID/secret for linking institutions
- Gmail/app password for sending verification/reset codes (optional but required for email flows)

## Configuration
1. Copy the backend env template and fill it out:
   ```bash
   cp src/backend/.env.example src/backend/.env
   ```
2. Required values:
   - `MONGO_URI` or `MONGODB_URI`: Mongo connection string (e.g., `mongodb://localhost:27017/fin_tool` or an Atlas URI).
   - `TOKEN_SECRET`: JWT signing key (example: `openssl rand -hex 32`).
   - `ENCRYPTION_KEY_BASE64`: 32-byte key for encrypting Plaid payloads (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
   - `PLAID_ENV`, `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_PRODUCTS`, `PLAID_COUNTRY_CODES`: Plaid Sandbox settings.
   - `APP_BASE_URL`: Public URL for the API (dev: `http://localhost:8080/api`).
   - `PYTHON_SERVICE`: URL for the quant service (defaults to `http://pythonservice:8001` in Docker).
   - Email + HMAC secrets for verification codes: `NODE_CODE_SENDING_EMAIL_ADDRESS`, `NODE_CODE_SENDING_EMAIL_PASSWORD`, `HMAC_VERIFICATION_CODE_SECRET`.

3. Optional: start a local Mongo container if you are not using Atlas:
   ```bash
   docker run -d --name fin-mongo -p 27017:27017 -v fin-mongo-data:/data/db mongo:7
   ```
4. If running locally (not via Docker), set `VITE_API_BASE_URL` in a `src/frontend/.env` file to point at your API (e.g., `http://localhost:3000/api`).

## Running with Docker Compose
```bash
docker compose -f src/compose.yml up --build
```
- Frontend: http://localhost:8080
- API health: http://localhost:8080/api/health
- Quant service health (exposed for dev): http://localhost:8001/health
- Stop the stack with `docker compose -f src/compose.yml down`.

## Local Development (without Docker)
1. **Backend**
   ```bash
   cd src/backend
   npm install
   npm run dev
   ```
2. **Quant service**
   ```bash
   cd src/pythonservice
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8001
   ```
3. **Frontend**
   ```bash
   cd src/frontend
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```
4. Visit `http://localhost:5173` (or through Nginx at `http://localhost:8080` if you prefer the proxy).

## Testing
- Backend: `cd src/backend && npm test`
- Frontend: `cd src/frontend && npm test`

## SRS
[SRS Document](https://docs.google.com/document/d/1D3O7_8-1gF3yylAjzuzBACsFTI97dkmTu2MsJCKZDz0/edit?usp=sharing)

## Built With
 * [React](https://react.dev/) + [Vite](https://vitejs.dev/)
 * [TailwindCSS](https://tailwindcss.com/)
 * [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/)
 * [MongoDB](https://www.mongodb.com/)
 * [FastAPI](https://fastapi.tiangolo.com/) for quant services
 * [NGINX](https://www.nginx.com/)
 * [Plaid](https://plaid.com/) for account aggregation

## Roadmap
- Investment goal tracking and budgeting with alerting
- Mobile-friendly PWA shell and push notifications
- Expanded analytics (scenario comparisons, tax-aware projections)
- Admin/audit views for troubleshooting Plaid connections
- Production-ready CI with automated tests and linting

## License
Licensed under the MIT License. See `LICENSE` for details.

## Acknowledgments
- Thanks to the open-source maintainers of React, Vite, Express, FastAPI, Tailwind, and MongoDB.
- Plaid Sandbox for testable financial data.
- Class staff for feedback and architecture guidance.
