import {newNode, addNode, getNode, getPath, getNodeByPath, updateNode, removeNode, produceNodePatches} from '../src/index';
import type {Nodes, NodeAny, NewNodeCreator} from '../src/index';
import {BASIC, OBJECT, ARRAY, applyPatches} from 'dendriform-immer-patch-optimiser';

type E = string;
const exampleData: E = 'aaa';

const createNodesFrom = (value: unknown): [Nodes<E>, NewNodeCreator<E>] => {
    const nodes = {};
    const countRef = {current: 0};
    const newNodeCreator = newNode(countRef, exampleData);
    addNode(nodes, newNodeCreator(value, -1));
    return [nodes, newNodeCreator];
};

describe(`Nodes`, () => {

    describe(`newNode()`, () => {

        test(`should accept basic values`, () => {
            const countRef = {
                current: 0
            };

            const expected = {
                type: BASIC,
                child: undefined,
                parentId: -1,
                id: 0,
                data: exampleData
            };

            expect(newNode(countRef, exampleData)(undefined, -1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef, exampleData)(null, -1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef, exampleData)(1, -1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef, exampleData)('string', -1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef, exampleData)(true, -1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef, exampleData)(NaN, -1)).toEqual(expected);
            expect(countRef.current).toBe(1);
        });

        test(`should accept objects`, () => {
            const countRef = {
                current: 0
            };

            const obj = {
                foo: 'foo!',
                bar: 'bar!'
            };

            expect(newNode(countRef, exampleData)(obj, -1)).toEqual({
                type: OBJECT,
                child: undefined,
                parentId: -1,
                id: 0,
                data: exampleData
            });
        });

        test(`should accept arrays`, () => {
            const countRef = {
                current: 0
            };

            const arr = ['a','b','c'];

            expect(newNode(countRef, exampleData)(arr, -1)).toEqual({
                type: ARRAY,
                child: undefined,
                parentId: -1,
                id: 0,
                data: exampleData
            });
        });
    });

    describe(`addNode()`, () => {

        test(`addNode() should add node`, () => {

            const node: NodeAny<E> = {
                type: OBJECT,
                child: undefined,
                parentId: -1,
                id: 0,
                data: exampleData
            };

            const node2: NodeAny<E> = {
                type: BASIC,
                child: undefined,
                parentId: 0,
                id: 1,
                data: exampleData
            };

            const nodes = {};
            addNode(nodes, node);
            addNode(nodes, node2);

            expect(nodes).toEqual({
                ['0']: node,
                ['1']: node2
            });
        });
    });

    describe(`getNode()`, () => {

        test(`should get node if its there`, () => {
            const node: NodeAny<E> = {
                type: OBJECT,
                child: undefined,
                parentId: -1,
                id: 0,
                data: exampleData
            };

            const nodes = {
                ['0']: node
            };

            expect(getNode(nodes, 0)).toBe(node);
        });

    });

    describe(`getNodeByPath()`, () => {

        test(`should return undefined if getNodeByPath() on basic`, () => {
            const value = 123;
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, ['foo'])).toBe(undefined);
        });

        test(`should accept objects and getNodeByPath()`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, ['foo'])).toEqual({
                type: BASIC,
                child: undefined,
                parentId: 0,
                id: 1,
                data: exampleData
            });

            expect(nodes['0'].child).toEqual({
                foo: 1,
                bar: 2
            });

            expect(nodes['1']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: 0,
                id: 1,
                data: exampleData
            });
        });

        test(`should accept objects and getNodeByPath() deep`, () => {
            const value = {foo: {bar: 'bar!'}};
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, ['foo'])).toEqual({
                type: OBJECT,
                child: undefined,
                parentId: 0,
                id: 1,
                data: exampleData
            });

            expect(nodes['0'].child).toEqual({
                foo: 1
            });

            expect(getNodeByPath(nodes, newNodeCreator, value, ['foo', 'bar'])).toEqual({
                type: BASIC,
                child: undefined,
                parentId: 1,
                id: 2,
                data: exampleData
            });

            expect(nodes['1'].child).toEqual({
                bar: 2
            });
        });

        test(`should accept objects and getNodeByPath() should return undefined if nothing at path`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, ['baz'])).toBe(undefined);

            expect(nodes['0'].child).toEqual({
                foo: 1,
                bar: 2
            });
        });

        test(`should accept arrays and getNodeByPath()`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, [2])).toEqual({
                type: BASIC,
                child: undefined,
                parentId: 0,
                id: 3,
                data: exampleData
            });

            // internal child check
            expect(nodes['0'].child).toEqual([1,2,3]);
        });

        test(`should accept arrays and getNodeByPath() and miss`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(getNodeByPath(nodes, newNodeCreator, value, [99])).toBe(undefined);
        });
    });

    describe(`getPath()`, () => {

        test(`should getPath() at top`, () => {
            const [nodes] = createNodesFrom({foo: 'foo!', bar: 'bar!'});
            expect(getPath(nodes, 0)).toEqual([]);
        });

        test(`should getPath() and return undefined if not id`, () => {
            const [nodes] = createNodesFrom({foo: 'foo!', bar: 'bar!'});
            expect(getPath(nodes, 999)).toBe(undefined);
        });

        test(`should getPath() on object value`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, ['bar']);
            // run test
            expect(getPath(nodes, 2)).toEqual(['bar']);
        });
    });

    describe(`removeNode()`, () => {
        test(`should remove nodes deeply`, () => {
            const value = {foo: {bar: 'bar!'}, baz: 'baz!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, ['foo','bar']);
            expect(Object.keys(nodes)).toEqual(['0','1','2','3']);

            // run test
            removeNode(nodes, 1);
            expect(Object.keys(nodes)).toEqual(['0','2']);
        });

        test(`should no nothing if node doesnt exist`, () => {
            const value = {foo: {bar: 'bar!'}, baz: 'baz!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, ['foo','bar']);

            const nodesBefore = JSON.stringify(nodes);

            // run test
            removeNode(nodes, 1888);

            // should be the same still
            expect(JSON.stringify(nodes)).toBe(nodesBefore);
        });
    });

    describe(`updateNode()`, () => {

        test(`should update item and change its type from basic to object`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, [2]);
            // run test
            updateNode(nodes, 3, {c: 'd'});
            // internal child check
            expect(nodes['3']).toEqual({
                type: OBJECT,
                child: undefined,
                parentId: 0,
                id: 3,
                data: exampleData
            });
        });

        test(`should update item and change its type from object to basic`, () => {
            const value = ['a','b',{c:'d'}];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, [2,'c']);
            expect(nodes['3'].child).toEqual({c: 4});
            expect(Object.keys(nodes)).toEqual(['0','1','2','3','4']);

            // run test
            updateNode(nodes, 3,'d');
            // internal child check
            expect(nodes['3']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: 0,
                id: 3,
                data: exampleData
            });
            // internal node check
            expect(Object.keys(nodes)).toEqual(['0','1','2','3']);
        });

        test(`should do nothing if node doesnt exist`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            getNodeByPath(nodes, newNodeCreator, value, [2]);

            const nodesBefore = JSON.stringify(nodes);

            // run test
            updateNode(nodes, 389890890, {c: 'd'});

            // should be the same still
            expect(JSON.stringify(nodes)).toBe(nodesBefore);
        });

    });

    describe(`produceNodePatches()`, () => {

        const testNodePatches = (msg: string, fn: (premakeChildNodes: boolean) => void) => {
            test(`${msg}, with premade child nodes`, () => fn(true));
            test(`${msg}, without premade child nodes`, () => fn(false));
        };

        describe(`should be able to apply object patches`, () => {
            testNodePatches(`of type "add"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','bar']);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'add', path: ['top','baz'], value: 3}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: 2, baz: 3}});

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['1']: {
                        ...nodesBefore['1'],
                        child: {
                            ...nodesBefore['1'].child,
                            baz: 4
                        }
                    },
                    ['4']: {
                        child: undefined,
                        id: 4,
                        parentId: 1,
                        type: BASIC,
                        data: exampleData
                    }
                });
            });

            testNodePatches(`of type "remove"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','bar']);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'remove', path: ['top','bar']}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1}});

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: nodesBefore['0'],
                    ['1']: {
                        ...nodesBefore['1'],
                        child: {
                            foo: 2
                        }
                    },
                    ['2']: nodesBefore['2']
                    // 3 should be missing
                });
            });

            testNodePatches(`of type "remove" parent`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','bar']);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'remove', path: ['top']}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({});

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: {
                        ...nodesBefore['0'],
                        child: {}
                    }
                    // everything else should be missing
                });
            });

            testNodePatches(`of type "replace"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','bar']);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'replace', path: ['top','bar'], value: 3}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: 3}});

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodesBefore);
            });

            testNodePatches(`of type "replace" and change type`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['top','bar']);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'replace', path: ['top','bar'], value: []}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: []}});

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['3']: {
                        child: undefined,
                        id: 3,
                        parentId: 1,
                        type: ARRAY,
                        data: exampleData
                    }
                });
            });
        });

        describe(`should be able to apply array patches`, () => {
            testNodePatches(`of type "add"`, (premakeChildNodes) => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [0]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [1]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [2]);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'add', path: [1], value: 'd'}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','d','b','c']);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['0']: {
                        ...nodesBefore['0'],
                        child: [1,4,2,3]
                    },
                    ['4']: {
                        child: undefined,
                        id: 4,
                        parentId: 0,
                        type: BASIC,
                        data: exampleData
                    }
                });
            });

            testNodePatches(`of type "remove"`, (premakeChildNodes) => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [0]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [1]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [2]);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'remove', path: [1]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','c']);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: {
                        ...nodesBefore['0'],
                        child: [1,3]
                    },
                    ['1']: nodesBefore['1'],
                    // 2 should be missing
                    ['3']: nodesBefore['3']
                });
            });

            testNodePatches(`of type "replace"`, (premakeChildNodes) => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [0]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [1]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [2]);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'replace', path: [1], value: '?'}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','?','c']);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodesBefore);
            });

            testNodePatches(`of type "move"`, (premakeChildNodes) => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [0]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [1]);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, [2]);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'move', from: [2], path: [1]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','c','b']);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['0']: {
                        ...nodesBefore['0'],
                        child: [1,3,2]
                    }
                });
            });

            testNodePatches(`of type "remove", setting childKeys correctly with getPath()`, (premakeChildNodes) => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                if(premakeChildNodes) {

                    getNodeByPath(nodes, newNodeCreator, value, [0]);
                    getNodeByPath(nodes, newNodeCreator, value, [1]);
                    getNodeByPath(nodes, newNodeCreator, value, [2]);

                    expect(nodes['0'].childKeysCached).toBe(undefined);

                    const path = getPath(nodes, 2);
                    expect(path).toEqual([1]);
                    expect(nodes['0'].childKeysCached).toBe(true);
                }

                const patches = [
                    {op: 'remove', path: [0]}
                ];

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes['0'].childKeysCached).toBe(false);

                const path2 = getPath(newNodes, 2);
                expect(path2).toEqual([0]);

                expect(newNodes['0'].childKeysCached).toBe(true);
            });
        });

        describe(`should be able to apply object patches at top level`, () => {
            testNodePatches(`of type "replace"`, (premakeChildNodes) => {
                const value = [1];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, []);
                const nodesBefore = nodes;

                const patches = [
                    {op: 'replace', path: [], value: [2]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual([2]);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodesBefore);
            });

            testNodePatches(`of type "replace" and change type`, (premakeChildNodes) => {
                const value = {foo: true};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, []);
                premakeChildNodes && getNodeByPath(nodes, newNodeCreator, value, ['foo']);

                const patches = [
                    {op: 'replace', path: [], value: 9}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(9);

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: {
                        child: undefined,
                        id: 0,
                        parentId: -1,
                        type: BASIC,
                        data: exampleData
                    }
                });
            });
        });
    });
});
