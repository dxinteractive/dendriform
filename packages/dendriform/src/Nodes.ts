import {BASIC, OBJECT, ARRAY, getType, get, set, each, applyPatches} from 'dendriform-immer-patch-optimiser';
import type {Path, DendriformPatch} from 'dendriform-immer-patch-optimiser';
import {produceWithPatches, setAutoFreeze} from 'immer';
import type {Draft} from 'immer';

// never autofreeze, this stops us from mutating node.child
// node.child is a safe mutation as the tree / nodes are entirely internal
setAutoFreeze(false);

export type NodeObject<D> = {
    type: typeof OBJECT;
    child?: {[key: string]: number};
    id: number;
    parentId: number;
    data: D;
};

export type NodeArray<D> = {
    type: typeof ARRAY;
    child?: number[];
    id: number;
    parentId: number;
    data: D;
};

export type NodeBasic<D> = {
    type: typeof BASIC;
    child: undefined;
    id: number;
    parentId: number;
    data: D;
};

export type NodeAny<D> = NodeObject<D>|NodeArray<D>|NodeBasic<D>;

export type Nodes<D> = {[id: string]: NodeAny<D>};

export type CountRef = {
    current: number
};

export type NewNodeCreator<D> = (value: unknown, parentId: number) => NodeAny<D>;

export const newNode = <D>(countRef: CountRef, data: D): NewNodeCreator<D> => {
    return (value: unknown, parentId: number): NodeAny<D> => {
        const type = getType(value);
        const id = countRef.current++;
        return {
            type,
            child: undefined,
            parentId,
            id,
            data
        };
    };
};

export const addNode = <D>(nodes: Nodes<D>, node: NodeAny<D>): void => {
    nodes[`${node.id}`] = node;
};

export const _prepChild = <P,D>(
    nodes: Nodes<D>,
    newNodeCreator: NewNodeCreator<D>,
    parentValueRef: P,
    parentNode: NodeAny<D>
): void => {

    if(parentNode.type === BASIC || parentNode.child) return;

    const child: number[]|{[key: string]: number} = parentNode.type === ARRAY ? [] : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    each(parentValueRef, (value, key: any) => {
        const childNode = newNodeCreator(value, parentNode.id);
        addNode(nodes, childNode);
        return set(child, key, childNode.id);
    });
    parentNode.child = child;
};

export const getNode = <D>(nodes: Nodes<D>, id: number): NodeAny<D>|undefined => {
    return nodes[`${id}`];
};

export const getNodeByPath = <D,P = unknown>(
    nodes: Nodes<D>,
    newNodeCreator: NewNodeCreator<D>,
    valueRef: P,
    path: Path,
    andChildren?: boolean
): NodeAny<D>|undefined => {

    let node: NodeAny<D>|undefined = nodes['0'];

    for(const key of path) {
        if(!node || node.type === BASIC) return undefined;

        _prepChild<P,D>(nodes, newNodeCreator, valueRef, node);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        const nextId = get(node.child, key);
        node = getNode(nodes, nextId);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        valueRef = get(valueRef, key);
    }

    if(andChildren && node) {
        _prepChild<P,D>(nodes, newNodeCreator, valueRef, node);
    }

    return node;
};

export const _getKey = <D>(parentNode: NodeAny<D>, childNode: NodeAny<D>): number|string|undefined => {
    let key = undefined;
    each(parentNode.child, (childId, childKey) => {
        if(childId === childNode.id) {
            key = childKey;
        }
    });
    return key;
};

export const getPath = <D>(nodes: Nodes<D>, id: number): Path|undefined => {
    let node: NodeAny<D> = get(nodes, id);
    if(!node) return undefined;

    const path: Path = [];
    while(node && node.parentId !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentNode: NodeAny<D> = get(nodes, node.parentId)!;
        const key = _getKey<D>(parentNode, node);
        if(key === undefined) return undefined;

        path.unshift(key);
        node = parentNode;
    }
    return path;
};

export const removeNode = <D>(nodes: Nodes<D>, id: number, onlyChildren = false): void => {
    const node = get(nodes, id);
    if(!node) return;

    if(node.child) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        each(node.child, id => removeNode<D>(nodes, id));
    }
    if(!onlyChildren) {
        delete nodes[`${id}`];
    }
};

export const updateNode = <D>(nodes: Nodes<D>, id: number, value: unknown): void => {
    const node = get(nodes, id);
    if(!node) return;

    removeNode<D>(nodes, id, true);
    const type = getType(value);
    nodes[`${id}`] = {
        ...node,
        type,
        child: undefined
    };
};

export const produceNodePatches = <D>(
    nodes: Nodes<D>,
    newNodeCreator: NewNodeCreator<D>,
    baseValue: unknown,
    valuePatches: DendriformPatch[]
): [Nodes<D>, DendriformPatch[], DendriformPatch[]] => {

    const result = produceWithPatches(nodes, draft => {

        // adapt patches to operate on nodes
        const patchesForNodes: DendriformPatch[] = [];
        valuePatches.forEach(patch => {
            const {op, path, value} = patch;

            if(path.length === 0 && op === 'replace') {
                updateNode(draft, 0, value);
                return;
            }

            const parentNode = getNodeByPath(
                nodes,
                newNodeCreator,
                baseValue,
                path.slice(0,-1),
                true
            );

            if(!parentNode) return;

            const basePath = [`${parentNode.id}`, 'child'];
            const key = path[path.length - 1];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const childId = get(parentNode.child, key);

            // depending on type, make changes to the child node
            // and to the parent node's child
            if(op === 'add') {
                const node = newNodeCreator(value, parentNode.id);
                addNode(draft, node as NodeAny<Draft<D>>);
                patchesForNodes.push({
                    op,
                    path: [...basePath, key],
                    value: node.id
                });

            } else if(op === 'remove') {
                removeNode(draft, childId);
                patchesForNodes.push({
                    op,
                    path: [...basePath, key]
                });

            } else if(op === 'replace') {
                updateNode(draft, childId, value);

            } else if(op === 'move' && patch.from) {
                const fromKey = patch.from[patch.from.length - 1];
                patchesForNodes.push({
                    op,
                    path: [...basePath, key],
                    from: [...basePath, fromKey]
                });
            }
        });

        // apply the patches to change parent node's children
        // (immer's produceWithPatches will collect the mutations)
        applyPatches(draft, patchesForNodes);
    });

    (result[1] as DendriformPatch[]).forEach(patch => patch.namespace = 'nodes');
    (result[2] as DendriformPatch[]).forEach(patch => patch.namespace = 'nodes');
    return result;
};
