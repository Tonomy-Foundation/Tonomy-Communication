FROM node:18.12.1 AS tonomy_communication_base

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install
RUN npm run build

EXPOSE 5000

CMD [ "npm", "run", "start:prod" ]

FROM tonomy_communication_base AS tonomy_communication_staging

ENV NODE_ENV=staging