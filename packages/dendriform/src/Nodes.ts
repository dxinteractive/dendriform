import {BASIC, OBJECT, ARRAY, MAP, getType, get, set, each, create, applyPatches} from 'dendriform-immer-patch-optimiser';
import type {Path, DendriformPatch} from 'dendriform-immer-patch-optimiser';
import {produceWithPatches} from 'immer';

export type NodeCommon = {
    id: string;
    parentId: string;
};

export type NodeObject = {
    type: typeof OBJECT;
    child?: {[key: string]: string};
} & NodeCommon;

export type NodeArray = {
    type: typeof ARRAY;
    child?: string[];
} & NodeCommon;

export type NodeMap = {
    type: typeof MAP;
    child?: Map<string|number,string>;
} & NodeCommon;

export type NodeBasic = {
    type: typeof BASIC;
    child: undefined;
} & NodeCommon;

export type NodeAny = NodeObject|NodeArray|NodeBasic|NodeMap;

export type Nodes = {[id: string]: NodeAny};

export type CountRef = {
    current: number;
};

export type NewNodeCreator = (value: unknown, parentId?: string) => NodeAny;

export const newNode = (countRef: CountRef): NewNodeCreator => {
    return (value: unknown, parentId = ''): NodeAny => {
        const type = getType(value);
        const id = `${countRef.current++}`;
        return {
            type,
            child: create(type),
            parentId,
            id
        };
    };
};

export const addNode = (nodes: Nodes, node: NodeAny): void => {
    nodes[node.id] = node;
};

export const getNode = (nodes: Nodes, id: string): NodeAny|undefined => {
    return nodes[id];
};

const _getOrCreateChild = <P = unknown>(nodes: Nodes, newNodeCreator: NewNodeCreator, parentNode: NodeAny, childValueRef: P, key: string|number): NodeAny|undefined => {
    const childId = get(parentNode.child, key);
    if(typeof childId === 'string') {
        return getNode(nodes, childId);
    }

    const childNode = newNodeCreator(childValueRef, parentNode.id);

    addNode(nodes, childNode);
    set(parentNode.child, key, childNode.id);
    return childNode;
};

export const getNodeByPath = <P = unknown>(
    nodes: Nodes,
    newNodeCreator: NewNodeCreator,
    valueRef: P,
    path: Path
): NodeAny|undefined => {

    let node: NodeAny|undefined = nodes['0'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let valueRefAny = valueRef as any;

    for(const key of path) {
        if(!node || node.type === BASIC) {
            node = undefined;
        } else {
            valueRefAny = get(valueRefAny, key);
            node = _getOrCreateChild(nodes, newNodeCreator, node, valueRefAny, key);
        }
    }

    return node;
};

const _getKey = (parentNode: NodeAny, childNode: NodeAny): number|string|undefined => {
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
    while(node && node.parentId !== '') {
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

    const type = getType(value);
    if(type !== ARRAY && type === node.type) {
        if(type === BASIC) return;
        each(node.child, (childId, childKey) => {
            updateNode(nodes, childId as string, get(value, childKey));
        });
        return;
    }

    removeNode(nodes, id, true);
    nodes[id] = {
        ...node,
        type,
        child: create(type)
    };
};

export const updateArrayNodeLength = (nodes: Nodes, id: string, length: number): void => {
    const node = get(nodes, id) as NodeAny|undefined;
    if(!node || node.type !== ARRAY) return;

    const child = node.child as string[];
    const newChild = child.slice(0, length);
    child.slice(length).forEach(id => {
        removeNode(nodes, id);
    });

    nodes[id] = {
        ...node,
        child: newChild
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
            const {path, value} = patch;
            let {op} = patch;

            if(path.length === 0 && op === 'replace') {
                updateNode(draft, '0', value);
                return;
            }

            const parentNode = getNodeByPath(draft, newNodeCreator, baseValue, path.slice(0,-1));
            if(!parentNode) return;

            const basePath = [parentNode.id, 'child'];
            const key = path[path.length - 1];

            // for some unknown reason, occasionally we get patches from immer
            // that say 'add' on object keys that already exist
            // ensure these actually replace
            if(op === 'add' && parentNode.type !== ARRAY && get(parentNode.child || {}, key)) {
                op = 'replace';
            }

            // if an array is changed by altering length
            // change the patch to do the same thing via a replace
            if(parentNode.type === ARRAY && path[path.length - 1] === 'length') {
                updateArrayNodeLength(draft, parentNode.id, value as number);
                return;
            }

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
                return;

            }

            if(op === 'move' && patch.from) {
                const fromKey = patch.from[patch.from.length - 1];
                patchesForNodes.push({
                    op,
                    path: [...basePath, key],
                    from: [...basePath, fromKey]
                });
                return;
            }

            const childId = getNodeByPath(draft, newNodeCreator, baseValue, path)?.id as string;

            if(op === 'remove') {
                removeNode(draft, childId);
                patchesForNodes.push({
                    op,
                    path: [...basePath, key]
                });
                return;

            }

            if(op === 'replace') {
                updateNode(draft, childId, value);
                return;
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
