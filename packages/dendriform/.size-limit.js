module.exports = [
    {
        name: 'everything combined',
        path: "dist/dendriform.esm.js",
        limit: "6.9 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'array',
        path: "dist/dendriform.esm.js",
        import: "{ array }",
        limit: "0.2 KB",
        ignore: ['react', 'react-dom', 'immer', 'shallow-equals']
    },
    {
        name: 'Dendriform',
        path: "dist/dendriform.esm.js",
        import: "{ Dendriform }",
        limit: "6.4 KB",
        ignore: ['react', 'react-dom']
    },
    {
        name: 'useCheckbox',
        path: "dist/dendriform.esm.js",
        import: "{ useCheckbox }",
        limit: "0.2 KB",
        ignore: ['react', 'react-dom', 'immer', 'shallow-equals']
    },
    {
        name: 'useInput',
        path: "dist/dendriform.esm.js",
        import: "{ useInput }",
        limit: "0.3 KB",
        ignore: ['react', 'react-dom', 'immer', 'shallow-equals']
    },
];