import type { Config } from 'jest';

// https://www.jenchan.biz/blog/dissecting-the-hell-jest-setup-esm-typescript-setup
// https://kulshekhar.github.io/ts-jest/docs/guides/esm-support/
const baseConfig: Config = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    collectCoverageFrom: ['**/*.(t|j)s'],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    transform: {
        '^.+\\.m?tsx?$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: './tsconfig.json',
                diagnostics: process.env.CI ? true : false,
            },
        ],
    },
    transformIgnorePatterns: [],
    extensionsToTreatAsEsm: ['.ts'],
};

const config: Config = {
    projects: [
        {
            ...baseConfig,
            displayName: 'Unit tests',
            rootDir: './src',
            testRegex: '.*\\.spec\\.ts$',
        },
        {
            ...baseConfig,
            displayName: 'End-to-end tests',
            rootDir: './test',
            testRegex: '.e2e-spec.ts$',
        },
    ],
};

export default config;
