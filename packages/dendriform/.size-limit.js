module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform.esm.js",
        limit: "9.9 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'Dendriform',
        path: "dist/dendriform.esm.js",
        import: "{ Dendriform }",
        limit: "8.8 KB",
        ignore: ['react', 'react-dom']
    }
];
