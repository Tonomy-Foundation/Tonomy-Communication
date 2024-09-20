# Tonomy Communication

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

Requires nodejs v20+

## Installation

```bash
yarn install
```

## Running the app

```bash
# development with watch mode
yarn run start

# production mode
yarn run build
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

## Debugging

Uses [debug](https://www.npmjs.com/package/debug) package. Use `export DEBUG="tonomy*"` to see all debug logs.

## API Documentation

<https://localhost:5000/openapi> (for REST API with Open API)
<https://localhost:5000/asyncapi> (for websocket with Async API)

## Digital Ocean Settings

Run in a Digital Ocean App which runs the nodejs project: <https://docs.digitalocean.com/products/app-platform/>

Using Ubuntu 22.04 with Nodejs 20+ is enabled:

- <https://docs.digitalocean.com/products/app-platform/reference/buildpacks/nodejs/#ubuntu-2204-stack-supporting-nodejs-18>

Build command: `yarn run build`

Run command: `yarn run start:prod`
