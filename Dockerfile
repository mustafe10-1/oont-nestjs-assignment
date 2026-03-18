FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
COPY package*.json ./
RUN npm install

FROM base AS build
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-slim AS prod
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]