# Tonomy Communication

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
yarn install
```

## Running the app

```bash
# development
yarn run start

# watch mode
yarn run start:dev

# production mode
yarn run start:prod
```

## Update the Tonomy-ID-SDK version to the latest

```bash
yarn run updateSdkVersion development
# or
yarn run updateSdkVersion master
```

## Environment variables and configuration

`NODE_ENV` - Determines which config file in `./src/config` to use
`TONOMY_OPS_PRIVATE_KEY` - The private key used to sign the transaction to create a new account
`HCAPTCHA_SECRET` - The hCaptcha account secret key

## Test

```bash
# unit tests
yarn run test

# e2e tests
yarn run test:e2e

# test coverage
yarn run test:cov
```

## API Documentation

<https://localhost:5000/openapi> (for REST API with Open API)
<https://localhost:5000/asyncapi> (for websocket with Async API)

## Digital Ocean Settings

Run in a Digital Ocean App which runs the nodejs project: <https://docs.digitalocean.com/products/app-platform/>

Using Ubuntu 22.04 with Nodejs 18.x is enabled:

- <https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/#ubuntu-2204-stack-supporting-nodejs-18>

Build command: `yarn -v && yarn install && yarn run build`

- NOTE: we need to run `yarn install` again so that we install with `yarn@3.1.1` which we force via`.yarnrc.yml` and `.yarn/releases/yarn-3.1.1.cjs`. See <https://github.com/Tonomy-Foundation/Tonomy-Communication/issues/85> for more details.

Run command: `yarn run start:prod`
