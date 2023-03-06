FROM node:18.12.1 AS tonomy_communication_base

WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm i -g yarn
RUN yarn install

# Bundle app source
COPY . .

RUN yarn run build

# Start the server using the production build
CMD [ "yarn","start:prod" ]

FROM tonomy_communication_base AS tonomy_communication_staging

ENV NODE_ENV=staging