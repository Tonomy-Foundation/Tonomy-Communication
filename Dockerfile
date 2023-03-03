FROM --platform= node:18.12.1 AS tonomy_communication_base

WORKDIR /usr/src/app

COPY ./ ./

RUN npm install

EXPOSE 5000

CMD [ "npm", "start" ]

FROM tonomy_communication_base AS tonomy_communication_staging

ENV NODE_ENV=staging