module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform-immer-patch-optimiser.esm.js",
        limit: "1.2 KB",
        ignore: ['immer']
    },
    {
        name: 'traverse',
        path: "dist/dendriform-immer-patch-optimiser.esm.js",
        import: "{ traverse }",
        limit: "0.2 KB",
        ignore: ['immer']
    },
    {
        name: 'zoomPatches',
        path: "dist/dendriform-immer-patch-optimiser.esm.js",
        import: "{ zoomPatches }",
        limit: "0.2 KB",
        ignore: ['immer']
    },
    {
        name: 'applyPatches',
        path: "dist/dendriform-immer-patch-optimiser.esm.js",
        import: "{ applyPatches }",
        limit: "0.4 KB",
        ignore: ['immer']
    },
    {
        name: 'optimise',
        path: "dist/dendriform-immer-patch-optimiser.esm.js",
        import: "{ optimise }",
        limit: "0.9 KB",
        ignore: ['immer']
    }
];
