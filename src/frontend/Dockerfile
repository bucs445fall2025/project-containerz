FROM node:latest

WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  else npm i; fi

COPY index.html ./
COPY vite.config.js ./
COPY src ./src


EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
