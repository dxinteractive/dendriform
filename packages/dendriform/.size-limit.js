module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform.esm.js",
        limit: "10.4 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'Dendriform',
        path: "dist/dendriform.esm.js",
        import: "{ Dendriform }",
        limit: "9.0 KB",
        ignore: ['react', 'react-dom']
    }
];
