FROM node:16-alpine as builder

WORKDIR /app

COPY . .

RUN npm ci && npm run build



FROM node:16

WORKDIR /app

COPY package*.json ./

RUN npm ci --production
RUN ls

COPY --from=builder /app/dist /app/dist
RUN ls

RUN mkdir -p public/images
RUN ls

ENV HTTP_PORT 3099
EXPOSE ${HTTP_PORT}

CMD ["npm", "start"]