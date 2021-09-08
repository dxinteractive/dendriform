import {newNode, addNode, getNode, getPath, getNodeByPath, updateNode, removeNode, produceNodePatches} from '../src/index';
import type {Nodes, NodeAny, NewNodeCreator} from '../src/index';
import {BASIC, OBJECT, ARRAY, MAP, applyPatches} from 'dendriform-immer-patch-optimiser';
import type {Path} from 'dendriform-immer-patch-optimiser';
import produce from 'immer';

const createNodesFrom = (value: unknown, current: number = 0): [Nodes, NewNodeCreator] => {
    const countRef = {current};
    const newNodeCreator = newNode(countRef);

    // use immer to add this, because immer freezes things and the tests must cope with that
    const nodes = produce({}, draft => {
        addNode(draft, newNodeCreator(value));
    });

    return [nodes, newNodeCreator];
};

const produceNodeByPath = <P = unknown>(
    nodes: Nodes,
    newNodeCreator: NewNodeCreator,
    valueRef: P,
    path: Path
): [Nodes, NodeAny|undefined] => {
    let node;
    const newNodes = produce(nodes, draft => {
        node = getNodeByPath(draft, newNodeCreator, valueRef, path);
    });
    return [newNodes, node];
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
                parentId: '',
                id: '0'
            };

            expect(newNode(countRef)(undefined)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef)(null)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef)(1)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef)('string')).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef)(true)).toEqual(expected);
            expect(countRef.current).toBe(1);

            countRef.current = 0;
            expect(newNode(countRef)(NaN)).toEqual(expected);
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

            expect(newNode(countRef)(obj)).toEqual({
                type: OBJECT,
                child: {},
                parentId: '',
                id: '0'
            });
        });

        test(`should accept arrays`, () => {
            const countRef = {
                current: 0
            };

            const arr = ['a','b','c'];

            expect(newNode(countRef)(arr)).toEqual({
                type: ARRAY,
                child: [],
                parentId: '',
                id: '0'
            });
        });

        test(`should accept maps`, () => {
            const countRef = {
                current: 0
            };

            const map = new Map<number,string>([
                [1, 'one'],
                [2, 'two']
            ]);

            expect(newNode(countRef)(map)).toEqual({
                type: MAP,
                child: new Map(),
                parentId: '',
                id: '0'
            });
        });
    });

    describe(`addNode()`, () => {

        test(`addNode() should add node`, () => {

            const node: NodeAny = {
                type: OBJECT,
                child: {},
                parentId: '',
                id: '0'
            };

            const node2: NodeAny = {
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
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
            const node: NodeAny = {
                type: OBJECT,
                child: {},
                parentId: '',
                id: '0'
            };

            const nodes = {
                ['0']: node
            };

            expect(getNode(nodes, '0')).toBe(node);
        });

    });

    describe(`getNodeByPath()`, () => {

        test(`should return undefined if getNodeByPath() on basic`, () => {
            const value = 123;
            const [nodes, newNodeCreator] = createNodesFrom(value);

            expect(produceNodeByPath(nodes, newNodeCreator, value, ['foo'])[1]).toBe(undefined);
        });

        test(`should accept objects and getNodeByPath()`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);

            const [newNodes, node] = produceNodeByPath(nodes, newNodeCreator, value, ['foo']);

            expect(node).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });

            expect(newNodes['0'].child).toEqual({
                foo: '1'
            });

            expect(newNodes['1']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });

            const [newNodes2, node2] = produceNodeByPath(newNodes, newNodeCreator, value, ['bar']);

            expect(node2).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '2'
            });

            expect(newNodes2['0'].child).toEqual({
                foo: '1',
                bar: '2'
            });

            expect(newNodes2['2']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '2'
            });
        });

        test(`should accept objects and getNodeByPath() deep`, () => {
            const value = {foo: {bar: 'bar!'}};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            const [newNodes, node] = produceNodeByPath(nodes, newNodeCreator, value, ['foo']);

            expect(node).toEqual({
                type: OBJECT,
                child: {},
                parentId: '0',
                id: '1'
            });

            expect(newNodes['0'].child).toEqual({
                foo: '1'
            });

            const [newNodes2, node2] = produceNodeByPath(newNodes, newNodeCreator, value, ['foo','bar']);
            expect(node2).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '1',
                id: '2'
            });

            expect(newNodes2['1'].child).toEqual({
                bar: '2'
            });
        });

        test(`should accept objects and getNodeByPath() should return basic node if nothing at path`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            const [newNodes, node] = produceNodeByPath(nodes, newNodeCreator, value, ['baz']);

            expect(node).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });

            expect(newNodes['0'].child).toEqual({
                baz: '1'
            });

            // make sure no mutations have occurred
            expect(value).toEqual({foo: 'foo!', bar: 'bar!'});
        });

        test(`should accept arrays and getNodeByPath()`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            const [newNodes, node] = produceNodeByPath(nodes, newNodeCreator, value, [2]);

            expect(node).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });

            // internal child check
            expect(newNodes['0'].child).toEqual([undefined,undefined,'1']);
        });

        test(`should accept arrays and getNodeByPath() and return basic node if nothing at path`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            const [newNodes, node] = produceNodeByPath(nodes, newNodeCreator, value, [3]);

            expect(node).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });

            expect(newNodes['0'].child).toEqual([undefined,undefined,undefined,'1']);

            const [newNodes2, node2] = produceNodeByPath(newNodes, newNodeCreator, value, [0]);

            expect(node2).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '2'
            });

            expect(newNodes2['0'].child).toEqual(['2',undefined,undefined,'1']);
        });
    });

    describe(`getPath()`, () => {

        test(`should getPath() at top`, () => {
            const [nodes] = createNodesFrom({foo: 'foo!', bar: 'bar!'});
            expect(getPath(nodes, '0')).toEqual([]);
        });

        test(`should getPath() and return undefined if not id`, () => {
            const [nodes] = createNodesFrom({foo: 'foo!', bar: 'bar!'});
            expect(getPath(nodes, '999')).toBe(undefined);
        });

        test(`should getPath() on object value`, () => {
            const value = {foo: 'foo!', bar: 'bar!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, ['bar']);
            // run test
            expect(getPath(newNodes, '1')).toEqual(['bar']);
        });
    });

    describe(`removeNode()`, () => {
        test(`should remove nodes deeply`, () => {
            const value = {foo: {bar: 'bar!'}, baz: 'baz!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, ['foo','bar']);
            const [newNodes2] = produceNodeByPath(newNodes, newNodeCreator, value, ['baz']);

            expect(Object.keys(newNodes2)).toEqual(['0','1','2','3']);

            // run test
            const newNodes3 = produce(newNodes2, draft => removeNode(draft, '1'));
            expect(Object.keys(newNodes3)).toEqual(['0','3']);
        });

        test(`should no nothing if node doesnt exist`, () => {
            const value = {foo: {bar: 'bar!'}, baz: 'baz!'};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, ['foo','bar']);

            const nodesBefore = JSON.stringify(newNodes);

            // run test
            const newNodes2 = produce(newNodes, draft => removeNode(draft, '1888'));

            // should be the same still
            expect(JSON.stringify(newNodes2)).toBe(nodesBefore);
        });
    });

    describe(`updateNode()`, () => {

        test(`should update item and change its type from basic to object`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, [2]);
            // run test
            const newNodes2 = produce(newNodes, draft => updateNode(draft, '1', {c: 'd'}));
            // internal child check
            expect(newNodes2['1']).toEqual({
                type: OBJECT,
                child: {},
                parentId: '0',
                id: '1'
            });
        });

        test(`should update item and change its type from object to basic`, () => {
            const value = ['a','b',{c:'d'}];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, [2,'c']);
            expect(newNodes['1'].child).toEqual({c: '2'});

            // run test
            const newNodes2 = produce(newNodes, draft => updateNode(draft, '1', 'd'));
            // internal child check
            expect(newNodes2['1']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });
        });

        test(`should update item and change a deeper paths type from basic to object`, () => {
            const value = {foo: true};
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, ['foo']);
            expect(newNodes['1']).toEqual({
                type: BASIC,
                child: undefined,
                parentId: '0',
                id: '1'
            });
            // run test
            const newNodes2 = produce(newNodes, draft => updateNode(draft, '0', {foo: {bar: {baz: true}}}));
            // internal child check
            expect(newNodes2['1']).toEqual({
                type: OBJECT,
                child: {},
                parentId: '0',
                id: '1'
            });
        });

        test(`should do nothing if node doesnt exist`, () => {
            const value = ['a','b','c'];
            const [nodes, newNodeCreator] = createNodesFrom(value);
            // create child nodes first
            const [newNodes] = produceNodeByPath(nodes, newNodeCreator, value, [2]);

            const nodesBefore = JSON.stringify(newNodes);

            // run test
            const newNodes2 = produce(newNodes, draft => updateNode(draft, '389890890', {c: 'd'}));

            // should be the same still
            expect(JSON.stringify(newNodes2)).toBe(nodesBefore);
        });

    });

    describe(`produceNodePatches()`, () => {

        const testNodePatches = (msg: string, fn: (premakeChildNodes: boolean) => void) => {
            test(`${msg}, with premade child nodes`, () => fn(true));
            test(`${msg}, without premade child nodes`, () => fn(false));
        };

        const premakeTopFooBar = (newNodeCreator: NewNodeCreator, nodes: Nodes, value: unknown): Nodes => {
            const [newNodes1] = produceNodeByPath(nodes, newNodeCreator, value, ['top','foo']);
            const [newNodes2] = produceNodeByPath(newNodes1, newNodeCreator, value, ['top','bar']);
            return newNodes2;
        };

        const premakeArrayNodes = (newNodeCreator: NewNodeCreator, nodes: Nodes, value: unknown): Nodes => {
            const [newNodes1] = produceNodeByPath(nodes, newNodeCreator, value, [0]);
            const [newNodes2] = produceNodeByPath(newNodes1, newNodeCreator, value, [1]);
            const [newNodes3] = produceNodeByPath(newNodes2, newNodeCreator, value, [2]);
            return newNodes3;
        };

        describe(`should be able to apply object patches`, () => {
            testNodePatches(`of type "add"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? premakeTopFooBar(newNodeCreator, nodes, value)
                    : nodes;

                const patches = [
                    {op: 'add', path: ['top','baz'], value: 3}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: 2, baz: 3}});

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const topChild = newNodes['1']?.child || {};
                expect('baz' in topChild).toBe(true);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const newId: string = topChild.baz;
                expect(newNodes[newId]).toEqual({
                    id: newId,
                    parentId: '1',
                    type: 0,
                    child: undefined
                });
            });

            testNodePatches(`of type "remove"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? premakeTopFooBar(newNodeCreator, nodes, value)
                    : nodes;

                const patches = [
                    {op: 'remove', path: ['top','bar']}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1}});

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const topChild = newNodes['1']?.child || {};
                expect('baz' in topChild).toBe(false);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const oldId = (nodesBefore['1']?.child || {}).bar;
                expect(oldId in newNodes).toBe(false);
            });

            testNodePatches(`of type "remove" parent`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? premakeTopFooBar(newNodeCreator, nodes, value)
                    : nodes;

                const patches = [
                    {op: 'remove', path: ['top']}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({});

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const rootChild = newNodes['0']?.child || {};
                expect('top' in rootChild).toBe(false);

                expect(Object.keys(newNodes)).toEqual(['0']);
            });

            testNodePatches(`of type "replace"`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? premakeTopFooBar(newNodeCreator, nodes, value)
                    : nodes;

                const patches = [
                    {op: 'replace', path: ['top','bar'], value: 3}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: 3}});

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const topChild = newNodes['1']?.child || {};
                expect('bar' in topChild).toBe(true);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const barId: string = topChild.bar;

                expect(newNodes[barId]?.type).toBe(0);
            });

            testNodePatches(`of type "replace" and change type`, (premakeChildNodes) => {
                const value = {top: {foo: 1, bar: 2}};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? premakeTopFooBar(newNodeCreator, nodes, value)
                    : nodes;

                const patches = [
                    {op: 'replace', path: ['top','bar'], value: []}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual({top: {foo: 1, bar: []}});

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const topChild = newNodes['1']?.child || {};
                expect('bar' in topChild).toBe(true);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const barId: string = topChild.bar;

                expect(newNodes[barId]?.type).toBe(ARRAY);
            });

            test(`should skip patches that try to edit children of types with no children`, () => {
                // in reality produceNodePatches is always done just after an applyPatches on the value
                // which in this situation will always error
                const value = 100;
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const patches = [
                    {op: 'add', path: ['top','baz'], value: 3}
                ];

                const [newNodes] = produceNodePatches(nodes, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodes);
            });

            test(`should ensure that add patches on non-arrays dont try to add if there is already somethign there - but why arent these replace patches in the first place?`, () => {
                // in reality produceNodePatches is always done just after an applyPatches on the value
                // which in this situation will always error
                const value = {foo: 123};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const [newNodes1] = produceNodeByPath(nodes, newNodeCreator, value, ['foo']);

                const patches = [
                    {op: 'add', path: ['foo'], value: 456}
                ];

                const [newNodes2] = produceNodePatches(newNodes1, newNodeCreator, value, patches);

                expect(newNodes2).toEqual(newNodes1);
            });
        });

        describe(`should be able to apply array patches`, () => {
            test(`of type "add"`, () => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeArrayNodes(newNodeCreator, nodes, value);

                const patches = [
                    {op: 'add', path: [1], value: 'd'}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','d','b','c']);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['0']: {
                        ...nodesBefore['0'],
                        child: ['1','4','2','3']
                    },
                    ['4']: {
                        child: undefined,
                        id: '4',
                        parentId: '0',
                        type: BASIC
                    }
                });
            });

            test(`of type "remove"`, () => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeArrayNodes(newNodeCreator, nodes, value);

                const patches = [
                    {op: 'remove', path: [1]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','c']);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: {
                        ...nodesBefore['0'],
                        child: ['1','3']
                    },
                    ['1']: nodesBefore['1'],
                    // 2 should be missing
                    ['3']: nodesBefore['3']
                });
            });

            test(`of type "replace"`, () => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeArrayNodes(newNodeCreator, nodes, value);

                const patches = [
                    {op: 'replace', path: [1], value: '?'}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','?','c']);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodesBefore);
            });

            test(`#47 incorrect nodes bug`, () => {
                const value = JSON.parse(`{"name":"Wappy","address":{"street":"Pump St"},"pets":[{"name":"Spike"},{"name":"Spoke"}]}`);
                const [,newNodeCreator] = createNodesFrom(value, 8);

                const nodesBefore = JSON.parse(`{"0":{"type":1,"child":{"name":"1","address":"2","pets":"4"},"parentId":"","id":"0"},"1":{"type":0,"parentId":"0","id":"1"},"2":{"type":1,"child":{"street":"3"},"parentId":"0","id":"2"},"3":{"type":0,"parentId":"2","id":"3"},"4":{"type":2,"child":["5","6"],"parentId":"0","id":"4"},"5":{"type":1,"child":{"name":"7"},"parentId":"4","id":"5"},"6":{"type":1,"child":{"name":"8"},"parentId":"4","id":"6"},"7":{"type":0,"parentId":"5","id":"7"},"8":{"type":0,"parentId":"6","id":"8"}}`);
                const expectedNodes = JSON.parse(`{"0":{"type":1,"child":{"name":"1","address":"2","pets":"4"},"parentId":"","id":"0"},"1":{"type":0,"parentId":"0","id":"1"},"2":{"type":1,"child":{"street":"3"},"parentId":"0","id":"2"},"3":{"type":0,"parentId":"2","id":"3"},"4":{"type":2,"child":["5"],"parentId":"0","id":"4"},"5":{"type":1,"child":{"name":"7"},"parentId":"4","id":"5"},"7":{"type":0,"parentId":"5","id":"7"}}`);
                const patches = JSON.parse(`[{"op":"replace","path":["pets","length"],"value":1}]`);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual(expectedNodes);
            });

            test(`of type "move"`, () => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeArrayNodes(newNodeCreator, nodes, value);

                const patches = [
                    {op: 'move', from: [2], path: [1]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(['a','c','b']);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ...nodesBefore,
                    ['0']: {
                        ...nodesBefore['0'],
                        child: ['1','3','2']
                    }
                });
            });

            test(`of type "remove", setting childKeys correctly with getPath()`, () => {
                const value = ['a','b','c'];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeArrayNodes(newNodeCreator, nodes, value);

                const path = getPath(nodesBefore, '2');
                expect(path).toEqual([1]);

                const patches = [
                    {op: 'remove', path: [0]}
                ];

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                const path2 = getPath(newNodes, '2');
                expect(path2).toEqual([0]);
            });
        });

        describe(`should be able to apply object patches at top level`, () => {
            testNodePatches(`of type "replace"`, (premakeChildNodes) => {
                const value = [1];
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? produceNodeByPath(nodes, newNodeCreator, value, [])[0]
                    : nodes;

                const patches = [
                    {op: 'replace', path: [], value: [2]}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual([2]);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual(nodesBefore);
            });

            testNodePatches(`of type "replace" and change type`, (premakeChildNodes) => {
                const value = {foo: true};
                const [nodes, newNodeCreator] = createNodesFrom(value);

                const nodesBefore = premakeChildNodes
                    ? produceNodeByPath(nodes, newNodeCreator, value, ['foo'])[0]
                    : nodes;

                const patches = [
                    {op: 'replace', path: [], value: 9}
                ];

                const newValue = applyPatches(value, patches);
                expect(newValue).toEqual(9);

                const [newNodes] = produceNodePatches(nodesBefore, newNodeCreator, value, patches);

                expect(newNodes).toEqual({
                    ['0']: {
                        child: undefined,
                        id: '0',
                        parentId: '',
                        type: BASIC
                    }
                });
            });
        });
    });
});
