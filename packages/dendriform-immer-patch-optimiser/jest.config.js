module.exports = {
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}"
    ],
    coverageThreshold: {
        global: {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100
        }
    }
};
