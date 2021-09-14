module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform.esm.js",
        limit: "9.4 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'Dendriform',
        path: "dist/dendriform.esm.js",
        import: "{ Dendriform }",
        limit: "8.6 KB",
        ignore: ['react', 'react-dom']
    }
];
