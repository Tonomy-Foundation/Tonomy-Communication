FROM node:18.12.1 AS tonomy_communication_base

WORKDIR /app
COPY . .

RUN corepack enable
RUN cp yarn.lock yarn.lock.bak
RUN yarn
RUN yarn run yarn:version
RUN cp yarn.lock.bak yarn.lock
RUN rm -rf node_modules && rm yarn.lock.bak
RUN yarn install --immutable

RUN yarn run build

EXPOSE 5000

CMD [ "yarn", "run", "start:prod" ]

FROM tonomy_communication_base AS tonomy_communication_staging

ENV NODE_ENV=staging