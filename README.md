# Tonomy Communication

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Installation

```bash
yarn install
```

For the `development` branch

```bash
yarn add @tonomy/tonomy-id-sdk@development
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

## Environment variables and configuration

`NODE_ENV` - Determines which config file in `./src/config` to use
`CREATE_ACCOUNT_PRIVATE_KEY` - The private key used to sign the transaction to create a new account
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
