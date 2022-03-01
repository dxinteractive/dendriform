module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform.esm.js",
        limit: "15 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'Dendriform',
        path: "dist/dendriform.esm.js",
        import: "{ Dendriform }",
        limit: "9.3 KB",
        ignore: ['react', 'react-dom']
    }
];
