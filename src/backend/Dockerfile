FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN apk add --no-cache bash
RUN set -eux; \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
  else npm i; fi

COPY src ./src
EXPOSE 3000
ENV HOST=0.0.0.0
CMD ["npm", "run", "dev"]