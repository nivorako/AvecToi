/** @type {import('jest').Config} */
module.exports = {
    preset: "ts-jest/presets/default-esm",
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    testMatch: ["<rootDir>/tests/**/*.test.ts"],
    maxWorkers: 1,
    extensionsToTreatAsEsm: [".ts"],
    globals: {
        "ts-jest": {
            useESM: true,
            tsconfig: "<rootDir>/tsconfig.json",
        },
    },
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
};
