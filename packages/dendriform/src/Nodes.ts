import {BASIC, OBJECT, ARRAY, MAP, getType, has, get, set, each, clone, applyPatches} from 'dendriform-immer-patch-optimiser';
import type {Path, DendriformPatch} from 'dendriform-immer-patch-optimiser';
import {produceWithPatches, setAutoFreeze} from 'immer';

// never autofreeze, this stops us from mutating node.child
// node.child is a safe mutation as the tree / nodes are entirely internal
setAutoFreeze(false);

export type NodeObject = {
    type: typeof OBJECT;
    child?: {[key: string]: string};
    id: string;
    parentId: string;
};

export type NodeArray = {
    type: typeof ARRAY;
    child?: string[];
    id: string;
    parentId: string;
};

export type NodeMap = {
    type: typeof MAP;
    child?: Map<string|number,string>;
    id: string;
    parentId: string;
};

export type NodeBasic = {
    type: typeof BASIC;
    child: undefined;
    id: string;
    parentId: string;
};

export type NodeAny = NodeObject|NodeArray|NodeBasic|NodeMap;

export type Nodes = {[id: string]: NodeAny};

export type CountRef = {
    current: number
};

export type NewNodeCreator = (value: unknown, parentId: string) => NodeAny;

export const newNode = (countRef: CountRef): NewNodeCreator => {
    return (value: unknown, parentId: string): NodeAny => {
        const type = getType(value);
        const id = `${countRef.current++}`;
        return {
            type,
            child: undefined,
            parentId,
            id
        };
    };
};

export const addNode = (nodes: Nodes, node: NodeAny): void => {
    nodes[node.id] = node;
};

export const _prepChild = <P>(
    nodes: Nodes,
    newNodeCreator: NewNodeCreator,
    parentValueRef: P,
    parentNode: NodeAny
): void => {

    if(parentNode.type === BASIC || parentNode.child) return;

    const child: string[]|{[key: string]: string}|Map<string|number,string> = parentNode.type === MAP
        ? new Map()
        : parentNode.type === ARRAY
            ? []
            : {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    each(parentValueRef, (value, key: any) => {
        const childNode = newNodeCreator(value, parentNode.id);
        addNode(nodes, childNode);
        return set(child, key, childNode.id);
    });
    parentNode.child = child;
};

export const getNode = (nodes: Nodes, id: string): NodeAny|undefined => {
    return nodes[id];
};

export const getNodeByPath = <P = unknown>(
    nodes: Nodes,
    newNodeCreator: NewNodeCreator,
    valueRef: P,
    path: Path,
    andChildren?: boolean
): NodeAny|undefined => {

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let valueRefAny = valueRef as any;
    let node: NodeAny|undefined = nodes['0'];

    for(const key of path) {
        if(!node || node.type === BASIC) return undefined;

        if(!has(valueRefAny, key)) {
            valueRefAny = clone(valueRefAny);
            set(valueRefAny, key, undefined);
        }

        _prepChild<P>(nodes, newNodeCreator, valueRefAny, node);

        const nextId = get(node.child, key) as string;
        node = getNode(nodes, nextId);
        valueRefAny = get(valueRefAny, key);
    }

    if(andChildren && node) {
        _prepChild<P>(nodes, newNodeCreator, valueRefAny, node);
    }

    return node;
};

export const _getKey = (parentNode: NodeAny, childNode: NodeAny): number|string|undefined => {
    let key = undefined;
    each(parentNode.child, (childId, childKey) => {
        if(childId === childNode.id) {
            key = childKey;
        }
    });
    return key;
};

export const getPath = (nodes: Nodes, id: string): Path|undefined => {
    let node = get(nodes, id) as NodeAny|undefined;
    if(!node) return undefined;

    const path: Path = [];
    while(node && node.parentId !== 'root') {
        const parentNode = get(nodes, node.parentId) as NodeAny;
        const key = _getKey(parentNode, node);
        if(key === undefined) return undefined;

        path.unshift(key);
        node = parentNode;
    }
    return path;
};

export const removeNode = (nodes: Nodes, id: string, onlyChildren = false): void => {
    const node = get(nodes, id) as NodeAny|undefined;
    if(!node) return;

    if(node.child) {
        each(node.child, id => removeNode(nodes, id as string));
    }
    if(!onlyChildren) {
        delete nodes[id];
    }
};

export const updateNode = (nodes: Nodes, id: string, value: unknown): void => {
    const node = get(nodes, id) as NodeAny|undefined;
    if(!node) return;

    removeNode(nodes, id, true);
    const type = getType(value);
    nodes[id] = {
        ...node,
        type,
        child: undefined
    };
};

export const produceNodePatches = (
    nodes: Nodes,
    newNodeCreator: NewNodeCreator,
    baseValue: unknown,
    valuePatches: DendriformPatch[]
): readonly [Nodes, DendriformPatch[], DendriformPatch[]] => {

    const result = produceWithPatches(nodes, draft => {

        // adapt patches to operate on nodes
        const patchesForNodes: DendriformPatch[] = [];
        valuePatches.forEach(patch => {
            const {op, path, value} = patch;

            if(path.length === 0 && op === 'replace') {
                updateNode(draft, '0', value);
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

            const basePath = [parentNode.id, 'child'];
            const key = path[path.length - 1];
            const childId = get(parentNode.child, key) as string;

            // depending on type, make changes to the child node
            // and to the parent node's child
            if(op === 'add') {
                const node = newNodeCreator(value, parentNode.id);
                addNode(draft, node as NodeAny);
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
    return result as readonly [Nodes, DendriformPatch[], DendriformPatch[]];
};
