FROM node:18.12.1 AS tonomy_communication_base

WORKDIR /usr/src/app

COPY package*.json ./

# Install app dependencies
RUN npm install --global yarn
RUN yarn install

# Bundle app source
COPY . .

RUN yarn run build

# Start the server using the production build
CMD [ "yarn","start:prod" ]

FROM tonomy_communication_base AS tonomy_communication_staging

ENV NODE_ENV=staging