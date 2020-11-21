
//
// dendriform
//

// internal structure
// - immer
//   - knows how to actually interact with data, apply changes and create patches for undo / redo
// - dendriform-immer-patch-optimiser
//   - improves immers patches to track movement of items and cut down on size of patches
//   - provides low level data traversal functions that agree with immer
// - dendriform Nodes
//   - make it possible to uniquely id parts of a data shape, even while paths change
// - dendriform Core
//   - stores a value and nodes (ids) and allows getting and setting of values and nodes
// - dendriform Dendriform
//   - provides a convenient traversal-based API for interacting with Core
//   - provides React hooks

import React from 'react';
import {useState, useEffect} from 'react';
import {shallowEqualArrays} from 'shallow-equal';
import {getIn, applyPatches, zoomOutPatches} from 'dendriform-immer-patch-optimiser';
import type {DendriformPatch, Path} from 'dendriform-immer-patch-optimiser';
import {producePatches} from './producePatches';
import type {ToProduce} from './producePatches';
import {BufferTime} from './BufferTime';
import {die} from './errors';
import {newNode, addNode, getPath, getNodeByPath, produceNodePatches} from './Nodes';
import type {Nodes, NodeAny, CountRef, NewNodeCreator} from './Nodes';

//
// core
//

type ProduceValue<V> = (toProduce: ToProduce<V>) => void;
type ChangeCallbackDetails = {
    patches: DendriformPatch[]
};
type ChangeCallback<V> = (newValue: V, details: ChangeCallbackDetails) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeCallbackRef = [number, ChangeCallback<any>, any];

type HistoryItem = {
    do: HistoryPatch;
    undo: HistoryPatch;
};

type HistoryPatch = {
    value: DendriformPatch[];
    nodes: DendriformPatch[];
};

//
// core
//

export type Options = {
    history?: number;
};

type CoreConfig<C> = {
    initialValue: C;
    options: Options;
};

class Core<C> {

    // the value in the form
    value: C;
    // cached Dendriform instances
    dendriforms = new Map<number,Dendriform<unknown,C>>();
    // transient working values, to allow multiple set() calls to be called in rapid succession
    dendriformsWorkingValues = new Map<number,unknown>();
    // callback refs, will be called when their values change
    changeCallbackRefs = new Set<ChangeCallbackRef>();

    // nodes
    // responsible for id-ing data pieces within the value tree
    // makes it possible to uniquely id parts of a data shape, even while paths change
    nodes: Nodes = {};
    nodeCountRef: CountRef = {current: 0};
    newNodeCreator: NewNodeCreator = newNode(this.nodeCountRef);

    // history
    historyIndex = 0;
    historyStack: HistoryItem[] = [];
    historyLimit: number;

    constructor(config: CoreConfig<C>) {
        this.value = config.initialValue;
        // create a root node for the value
        addNode(this.nodes, this.newNodeCreator(this.value, -1));

        this.historyLimit = config.options.history || 0;
    }

    getPath = (id: number): Path|undefined => {
        return getPath(this.nodes, id);
    };

    getPathOrError = (id: number): Path => {
        const path = this.getPath(id);
        if(!path) die(0, id);
        return path;
    };

    getValue = (id: number): unknown => {
        const path = this.getPath(id);
        if(!path) return undefined;
        return getIn(this.value, path);
    };

    createForm = (node: NodeAny): Dendriform<unknown,C> => {
        const {id} = node;
        const __branch = {core: this, id};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = new Dendriform<any>({__branch});
        this.dendriforms.set(id, form);
        return form;
    };

    getFormAt = (path: Path): Dendriform<unknown,C> => {
        const node = getNodeByPath(this.nodes, this.newNodeCreator, this.value, path);
        if(!node) die(1, path);
        return this.dendriforms.get(node.id) || this.createForm(node);
    };

    set = (id: number, toProduce: unknown): void => {
        const path = this.getPath(id);
        if(!path) return;

        // get the current value, or working copy value if it exists
        const value = this.dendriformsWorkingValues.has(id)
            ? this.dendriformsWorkingValues.get(id)
            : this.getValue(id);

        // produce patches that describe the change
        const [newValue, valuePatches, valuePatchesInv] = producePatches(value, toProduce);
        this.dendriformsWorkingValues.set(id, newValue);

        // transform patches so they have absolute paths
        const valuePatchesZoomed = zoomOutPatches(path, valuePatches);
        const valuePatchesInvZoomed = zoomOutPatches(path, valuePatchesInv);

        // produce node patches, so that changes in the value
        // are accompanied by corresponding changes in the nodes
        const [, nodesPatches, nodesPatchesInv] = produceNodePatches(
            this.nodes,
            this.newNodeCreator,
            this.value,
            valuePatchesZoomed
        );

        // add patches into the change buffer
        this.changeBuffer.push({
            do: {
                value: valuePatchesZoomed,
                nodes: nodesPatches
            },
            undo: {
                value: valuePatchesInvZoomed,
                nodes: nodesPatchesInv
            }
        });
    };

    handleBufferChange = (items: HistoryItem[]): void => {

        const historyItem: HistoryItem = {
            do: {value: [], nodes: []},
            undo: {value: [], nodes: []}
        };

        // squash together buffered changes
        items.forEach((item: HistoryItem) => {
            historyItem.do.value.push(...item.do.value);
            historyItem.do.nodes.push(...item.do.nodes);
            historyItem.undo.value.unshift(...item.undo.value);
            historyItem.undo.nodes.unshift(...item.undo.nodes);
        });

        // add changes to history, and also apply them
        this.historyPush(historyItem);
        this.applyChanges(historyItem.do);
    };

    changeBuffer = new BufferTime<HistoryItem>(this.handleBufferChange);

    applyChanges = (historyPatch: HistoryPatch): void => {
        // apply changes to value and nodes
        this.value = applyPatches(this.value, historyPatch.value);
        this.nodes = applyPatches(this.nodes, historyPatch.nodes);
        this.dendriformsWorkingValues.clear();

        // update all callbacks
        this.changeCallbackRefs.forEach((changeCallbackRef) => {
            const nextValue = this.getValue(changeCallbackRef[0]);
            this.updateChangeCallback(changeCallbackRef, nextValue, {
                patches: historyPatch.value
            });
        });
    };

    historyPush = (historyItem: HistoryItem) => {
        this.historyStack.length = this.historyIndex;
        this.historyStack.push(historyItem);

        if(this.historyStack.length > this.historyLimit) {
            this.historyStack.shift();
        } else {
            this.historyIndex++;
        }
    };

    undo = (): void => {
        if(this.historyIndex === 0) return;
        this.applyChanges(this.historyStack[--this.historyIndex].undo);
    };

    redo = (): void => {
        if(this.historyIndex === this.historyStack.length) return;
        this.applyChanges(this.historyStack[this.historyIndex++].do);
    };

    updateChangeCallback = (
        changeCallbackRef: ChangeCallbackRef,
        nextValue: unknown,
        details: ChangeCallbackDetails
    ): void => {
        // only update a callback if it is not equal to the previous value
        const [, callback, prevValue] = changeCallbackRef;
        if(!Object.is(nextValue, prevValue)) {
            callback(nextValue, details);
            changeCallbackRef[2] = nextValue;
        }
    };
}

//
// branch
//
// memoised component returned by Dendriform.branch()
// should only update based on deps (or based on own state changing)
//

type BranchProps = {
    renderer: () => React.ReactElement|React.ReactElement[];
    deps: unknown[];
};

// eslint-disable-next-line react/display-name
const Branch = React.memo(
    // eslint-disable-next-line react/prop-types
    (props: BranchProps): React.ReactElement => <>{props.renderer()}</>,
    (prevProps, nextProps) => shallowEqualArrays(prevProps.deps, nextProps.deps)
);

//
// Dendriform
//
// (wrapper around core)
//

type DendriformBranch<C> = {
    __branch: {
        core: Core<C>;
        id: number;
    };
};

type Renderer<D> = (form: D) => React.ReactElement;

type ChildToProduce<V> = (key: number|string) => ToProduce<V>;

export class Dendriform<V,C=V> {

    // dev notes:
    // the dendriform class is merely a fancy way to get and set data
    // Dendriform instances should never be stateful
    // only Core should be stateful
    // hooks provided by Dendriform can obviously be stateful

    core: Core<C>;
    id: number;

    constructor(initialValue: V|DendriformBranch<C>, options: Options = {}) {

        // if branching off an existing form, pass id and core along
        if(initialValue instanceof Object && (initialValue as DendriformBranch<C>).__branch) {
            const {__branch} = initialValue as DendriformBranch<C>;
            this.core = __branch.core;
            this.id = __branch.id;
            return;
        }

        // if not branch off an existing form, make a core
        this.id = 0;
        this.core = new Core<C>({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            initialValue: initialValue as C,
            options
        });
    }

    //
    // public api
    //

    get value(): V {
        return this.core.getValue(this.id) as V;
    }

    set = (toProduce: ToProduce<V>): void => {
        this.core.set(this.id, toProduce);
    };

    setParent = (childToProduce: ChildToProduce<unknown>): void => {
        const basePath = this.core.getPathOrError(this.id);
        const parent = this.core.getFormAt(basePath.slice(0,-1));
        this.core.set(parent.id, childToProduce(basePath[basePath.length - 1]));
    };

    onChange = (callback: ChangeCallback<V>): (() => void) => {
        const changeCallback: ChangeCallbackRef = [this.id, callback, this.value];
        this.core.changeCallbackRefs.add(changeCallback);
        return () => void this.core.changeCallbackRefs.delete(changeCallback);
    };

    undo = (): void => this.core.undo();

    redo = (): void => this.core.redo();

    //
    // hooks
    //

    useValue = (): [V, ProduceValue<V>] => {
        const [value, setValue] = useState<V>(() => this.value);
        this.useChange(setValue);
        return [value, this.set];
    };

    useChange = (callback: ChangeCallback<V>): void => {
        useEffect(() => this.onChange(callback), []);
    };

    //
    // branching
    //

    branch<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], K4 extends keyof V[K1][K2][K3]>(path: [K1, K2, K3, K4]): Dendriform<V[K1][K2][K3][K4],C>;
    branch<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2]>(path: [K1, K2, K3]): Dendriform<V[K1][K2][K3],C>;
    branch<K1 extends keyof V, K2 extends keyof V[K1]>(path: [K1, K2]): Dendriform<V[K1][K2],C>;
    branch<K1 extends keyof V>(path: [K1]): Dendriform<V[K1],C>;
    branch(path?: []): Dendriform<V,C>;
    branch<K1 extends keyof V>(key: K1): Dendriform<V[K1],C>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branch(pathOrKey: any): any {
        const appendPath = ([] as Path).concat(pathOrKey ?? []);
        const basePath = this.core.getPathOrError(this.id);
        return this.core.getFormAt(basePath.concat(appendPath));
    }

    branchAll<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], K4 extends keyof V[K1][K2][K3], W extends V[K1][K2][K3][K4] & unknown[]>(path: [K1, K2, K3, K4]): Dendriform<W[0],C>[];
    branchAll<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], W extends V[K1][K2][K3] & unknown[]>(path: [K1, K2, K3]): Dendriform<W[0],C>[];
    branchAll<K1 extends keyof V, K2 extends keyof V[K1], W extends V[K1][K2] & unknown[]>(path: [K1, K2]): Dendriform<W[0],C>[];
    branchAll<K1 extends keyof V, W extends V[K1] & unknown[]>(path: [K1]): Dendriform<W[0],C>[];
    branchAll<K1 extends keyof V, W extends V[K1] & unknown[]>(key: K1): Dendriform<W[0],C>[];
    branchAll<W extends V & unknown[]>(path?: []): Dendriform<W[0],C>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branchAll(pathOrKey: any): any {
        const got = this.branch(pathOrKey);
        const array = got.value;
        if(!Array.isArray(array)) die(2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return array.map((_element, index) => got.branch(index as any));
    }

    render<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], K4 extends keyof V[K1][K2][K3]>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<V[K1][K2][K3][K4],C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2]>(path: [K1, K2, K3], renderer: Renderer<Dendriform<V[K1][K2][K3],C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends keyof V, K2 extends keyof V[K1]>(path: [K1, K2], renderer: Renderer<Dendriform<V[K1][K2],C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends keyof V>(path: [K1], renderer: Renderer<Dendriform<V[K1],C>>, deps?: unknown[]): React.ReactElement;
    render(path: [], renderer: Renderer<Dendriform<V,C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends keyof V>(key: K1, renderer: Renderer<Dendriform<V[K1],C>>, deps?: unknown[]): React.ReactElement;
    render(renderer: Renderer<Dendriform<V,C>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,  @typescript-eslint/explicit-module-boundary-types
    render(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);
        return <Branch renderer={() => renderer(form)} deps={deps} />;
    }

    renderAll<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], K4 extends keyof V[K1][K2][K3], W extends V[K1][K2][K3][K4] & unknown[]>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], W extends V[K1][K2][K3] & unknown[]>(path: [K1, K2, K3], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends keyof V, K2 extends keyof V[K1], W extends V[K1][K2] & unknown[]>(path: [K1, K2], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends keyof V, W extends V[K1] & unknown[]>(path: [K1], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & unknown[]>(path: [], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends keyof V, W extends V[K1] & unknown[]>(key: K1, renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & unknown[]>(renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    renderAll(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);

        const containerRenderer = (): React.ReactElement[] => {
            const [array] = form.useValue();
            if(!Array.isArray(array)) die(3);

            return array.map((_element, index): React.ReactElement => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const child = form.branch(index as any);
                return <div key={child.id}>
                    {child.id}: <Branch renderer={() => renderer(child)} deps={deps} />
                </div>;
            });
        };

        return <Branch renderer={containerRenderer} deps={deps} />;
    }
}

//
// useDendriform
//

type UseDendriformValue<V> = (() => V)|V;

export const useDendriform = <V,C=V>(initialValue: UseDendriformValue<V>): Dendriform<V,C> => {
    const [form] = useState(() => {
        const value = typeof initialValue === 'function'
            ? (initialValue as (() => V))()
            : initialValue;

        return new Dendriform<V,C>(value as V);
    });
    return form;
};
