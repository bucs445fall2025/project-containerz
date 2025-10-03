FROM node:22

WORKDIR /app
COPY package*.json ./
# RUN \
#   if [ -f package-lock.json ]; then npm ci; \
#   elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
#   elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm i --frozen-lockfile; \
#   else npm i; fi
RUN npm install --production

COPY src ./src
EXPOSE 3000
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
CMD ["node", "server.js"]