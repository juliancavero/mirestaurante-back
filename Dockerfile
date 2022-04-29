FROM node:16-alpine as builder

WORKDIR /usr/app

COPY . .

RUN npm ci && npm run build



FROM node:16-alpine

WORKDIR /usr/app

COPY package*.json ./

RUN npm ci --production

COPY --from=builder /usr/app/dist ./dist

ENV HTTP_PORT 4040
EXPOSE ${HTTP_PORT}

CMD ["npm", "start"]