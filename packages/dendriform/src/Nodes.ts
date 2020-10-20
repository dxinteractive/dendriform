import {BASIC, OBJECT, ARRAY, getType, get, set, each, applyPatches} from 'dendriform-immer-patch-optimiser';
import type {Path, DendriformPatch} from 'dendriform-immer-patch-optimiser';
import {produceWithPatches, setAutoFreeze} from 'immer';

// never autofreeze, this stops us from mutating node.child
// node.child is a safe mutation as the tree / nodes are entirely internal
setAutoFreeze(false);

export type NodeObject = {
    type: typeof OBJECT;
    child?: {[key: string]: number};
    childKeysCached?: boolean;
    id: number;
    parentId: number;
    cachedKey?: number|string;
};

export type NodeArray = {
    type: typeof ARRAY;
    child?: number[];
    childKeysCached?: boolean;
    id: number;
    parentId: number;
    cachedKey?: number|string;
};

export type NodeBasic = {
    type: typeof BASIC;
    child: undefined;
    childKeysCached?: boolean;
    id: number;
    parentId: number;
    cachedKey?: number|string;
};

export type NodeAny = NodeObject|NodeArray|NodeBasic;

export type Nodes = {[id: string]: NodeAny};

export type CountRef = {
    current: number
};

export const newNode = (countRef: CountRef, value: unknown, parentId: number): NodeAny => {
    const type = getType(value);
    const id = countRef.current++;
    return {
        type,
        child: undefined,
        parentId,
        id
    };
};

export const addNode = (nodes: Nodes, node: NodeAny): void => {
    nodes[`${node.id}`] = node;
};

export const _prepChild = <P>(
    nodes: Nodes,
    countRef: CountRef,
    parentValueRef: P,
    parentNode: NodeAny
): void => {

    if(parentNode.type === BASIC || parentNode.child) return;

    const child: number[]|{[key: string]: number} = parentNode.type === ARRAY ? [] : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    each(parentValueRef, (value, key: any) => {
        const childNode = newNode(countRef, value, parentNode.id);
        addNode(nodes, childNode);
        return set(child, key, childNode.id);
    });
    parentNode.child = child;
};

export const getNode = (nodes: Nodes, id: number): NodeAny|undefined => {
    return nodes[`${id}`];
};

export const getNodeByPath = (
    nodes: Nodes,
    countRef: CountRef,
    valueRef: unknown,
    path: Path,
    andChildren?: boolean
): NodeAny|undefined => {

    let node: NodeAny|undefined = nodes['0'];

    for(const key of path) {
        if(!node || node.type === BASIC) return undefined;

        _prepChild(nodes, countRef, valueRef, node);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        const nextId = get(node.child, key);
        node = getNode(nodes, nextId);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        valueRef = get(valueRef, key);
    }

    if(andChildren && node) {
        _prepChild(nodes, countRef, valueRef, node);
    }

    return node;
};

export const _getKey = (
    nodes: Nodes,
    parentNode: NodeAny,
    childNode: NodeAny
): number|string => {

    if(!parentNode.childKeysCached) {
        each(parentNode.child, (value, key) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            getNode(nodes, value)!.cachedKey = key;
        });
        parentNode.childKeysCached = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return childNode.cachedKey!;
};

export const getPath = (nodes: Nodes, id: number): Path|undefined => {
    let node: NodeAny = get(nodes, id);
    if(!node) return undefined;

    const path: Path = [];
    while(node && node.parentId !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const parentNode: NodeAny = get(nodes, node.parentId)!;
        const key = _getKey(nodes, parentNode, node);
        path.unshift(key);
        node = parentNode;
    }
    return path;
};

export const removeNode = (nodes: Nodes, id: number, onlyChildren = false): void => {
    const node = get(nodes, id);
    if(!node) return;

    if(node.child) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Path is a bit too loose for get() to be happy
        each(node.child, id => removeNode(nodes, id));
    }
    if(!onlyChildren) {
        delete nodes[`${id}`];
    }
};

export const updateNode = (nodes: Nodes, id: number, value: unknown): void => {
    const node = get(nodes, id);
    if(!node) return;

    removeNode(nodes, id, true);
    const type = getType(value);
    nodes[`${id}`] = {
        ...node,
        type,
        child: undefined
    };
};

export const produceNodePatches = (
    nodes: Nodes,
    countRef: CountRef,
    baseValue: unknown,
    valuePatches: DendriformPatch[]
): [Nodes, DendriformPatch[], DendriformPatch[]] => {

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
                countRef,
                baseValue,
                path.slice(0,-1),
                true
            );

            if(!parentNode) return;

            parentNode.childKeysCached = false;

            const basePath = [`${parentNode.id}`, 'child'];
            const key = path[path.length - 1];
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const childId = get(parentNode.child, key);

            // depending on type, make changes to the child node
            // and to the parent node's child
            if(op === 'add') {
                const node = newNode(countRef, value, parentNode.id);
                addNode(draft, node);
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
