FROM node:16-alpine

ENV PORT 3099

WORKDIR /usr/app

COPY package*.json ./

RUN npm ci && ls

RUN npm run build

RUN ls

EXPOSE 3099

CMD [ "npm", "start" ]