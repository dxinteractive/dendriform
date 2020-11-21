module.exports = {
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}"
    ],
    coverageThreshold: {
        global: {
            statements: 97,
            branches: 93,
            functions: 100,
            lines: 100
        }
    },
    globals: {
        __DEV__: true
    }
};
