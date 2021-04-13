
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
import {die} from './errors';
import {newNode, addNode, getPath, getNodeByPath, produceNodePatches} from './Nodes';
import type {Nodes, NodeAny, CountRef, NewNodeCreator} from './Nodes';

//
// core
//

type HistoryItem = {
    do: HistoryPatch;
    undo: HistoryPatch;
};

type HistoryPatch = {
    value: DendriformPatch[];
    nodes: DendriformPatch[];
};

type HistoryState = {
    canUndo: boolean;
    canRedo: boolean;
};

type ChangeCallbackDetails = {
    patches: HistoryPatch
};
type ChangeCallback<V> = (newValue: V, details: ChangeCallbackDetails) => void;
type ChangeTypeValue = 'value';
type ChangeTypeIndex = 'index';
type ChangeTypeHistory = 'history';
type ChangeType = ChangeTypeValue|ChangeTypeIndex|ChangeTypeHistory;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeCallbackRef = [ChangeType, string, ChangeCallback<any>, any];

export type DeriveCallbackDetails = {
    go: number;
    replace: boolean;
    patches: HistoryPatch
};
export type DeriveCallback<V> = (newValue: V, details: DeriveCallbackDetails) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DeriveCallbackRef = [DeriveCallback<any>];

//
// core
//

export type Options = {
    history?: number;
    replace?: boolean;
};

type CoreConfig<C> = {
    initialValue: C;
    options: Options;
};

const emptyHistoryPatch = (): HistoryPatch => ({value: [], nodes: []});

class Core<C> {

    // the value in the form
    value: C;
    // cached Dendriform instances
    dendriforms = new Map<string,Dendriform<unknown,C>>();
    // derive callback refs, will be called while values are changing and require data to be derived
    deriveCallbackRefs = new Set<DeriveCallbackRef>();
    // change callback refs, will be called when values are to be pushed out to subscribers
    changeCallbackRefs = new Set<ChangeCallbackRef>();

    // nodes
    // responsible for id-ing data pieces within the value tree
    // makes it possible to uniquely id parts of a data shape, even while paths change
    nodes: Nodes = {};
    nodeCountRef: CountRef = {current: 0};
    newNodeCreator: NewNodeCreator = newNode(this.nodeCountRef);

    constructor(config: CoreConfig<C>) {
        this.value = config.initialValue;
        // create a root node for the value
        addNode(this.nodes, this.newNodeCreator(this.value, 'root'));

        this.historyLimit = config.options.history || 0;
        this.replaceByDefault = !!config.options.replace;
    }

    //
    // data access
    //

    getPath = (id: string): Path|undefined => {
        return getPath(this.nodes, id);
    };

    getPathOrError = (id: string): Path => {
        const path = this.getPath(id);
        if(!path) die(0, id);
        return path;
    };

    getValue = (id: string): unknown => {
        const path = this.getPath(id);
        if(!path) return undefined;
        return getIn(this.value, path);
    };

    getIndex = (id: string): number => {
        const path = this.getPath(id);
        if(!path) return -1;
        const [key] = path.slice(-1);
        if(typeof key !== 'number') die(4, path);
        return key;
    };

    valueGettersByType: {[key in ChangeType]: (id: string) => unknown} = {
        value: this.getValue,
        index: this.getIndex,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        history: (_id) => this.historyState
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

    //
    // setting data
    //

    // if setBuffer exists, then new changes will be merged onto it
    // if not, a new change will push a new history item
    bufferingChanges = false;
    setBuffer?: HistoryPatch;
    replaceByDefault = false;

    set = (id: string, toProduce: unknown): void => {
        const path = this.getPath(id);
        if(!path) return;

        // produce patches that describe the change
        const [, valuePatches, valuePatchesInv] = producePatches(this.getValue(id), toProduce);

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

        // create history item
        const historyItem: HistoryItem = {
            do: {
                value: valuePatchesZoomed,
                nodes: nodesPatches
            },
            undo: {
                value: valuePatchesInvZoomed,
                nodes: nodesPatchesInv
            }
        };

        // apply changes to .value and .nodes
        this.applyChanges(historyItem.do);

        // if we're in the middle of calling go() or deriving, dont bother with buffers or deriving
        // derived data shouldn't end up in the history stack, it should always be re-derived
        if(this.going || this.deriving) return;

        // push new history item, or replace last history item
        const replace = !!this.setBuffer;
        if(replace) {
            this.historyReplace(historyItem);
        } else {
            this.historyPush(historyItem);
        }

        this.setBuffer = {
            value: (this.setBuffer?.value || []).concat(historyItem.do.value),
            nodes: (this.setBuffer?.nodes || []).concat(historyItem.do.nodes)
        };

        // call derive callbacks
        // but only if there are changes, or else this may be a deliberate noChange
        // e.g. when sync() deliberately adds empty history items
        if(historyItem.do.value.length > 0) {
            this.callAllDeriveCallbacks(0, replace);
        }

        // call change callbacks
        this.callAllChangeCallbacks();
    };

    applyChanges = (historyPatch: HistoryPatch): void => {
        // apply changes to .value and .nodes
        this.value = applyPatches(this.value, historyPatch.value);
        this.nodes = applyPatches(this.nodes, historyPatch.nodes);

        // add changes to change buffer
        this.changeBuffer = {
            value: (this.changeBuffer?.value || []).concat(historyPatch.value),
            nodes: (this.changeBuffer?.nodes || []).concat(historyPatch.nodes)
        };
    };

    replace = (replace: boolean) => {
        if(!replace) {
            this.setBuffer = undefined;
        } else if(!this.setBuffer) {
            this.setBuffer = emptyHistoryPatch();
        }
    };

    newHistoryItem = () => {
        this.setBuffer = this.replaceByDefault
            ? emptyHistoryPatch()
            : undefined;
    };

    //
    // derive
    //

    deriving = false;

    callAllDeriveCallbacks = (go: number, replace: boolean): void => {
        this.deriveCallbackRefs.forEach((deriveCallbackRef) => {
            this.derive(deriveCallbackRef, go, replace);
        });
    };

    derive = (
        deriveCallbackRef: DeriveCallbackRef,
        go: number,
        replace: boolean
    ): void => {
        if(this.deriving) return;
        this.deriving = true;

        const [deriveCallback] = deriveCallbackRef;
        const patches = this.changeBuffer ?? emptyHistoryPatch();
        deriveCallback(this.value, {go, replace, patches});

        this.deriving = false;
    };

    //
    // change
    //

    changeBuffer?: HistoryPatch;

    buffer = (): void => {
        this.bufferingChanges = true;
        this.newHistoryItem();
    };

    done = () => {
        this.bufferingChanges = false;
        this.callAllChangeCallbacks();
    };

    callAllChangeCallbacks = (): void => {
        // if buffering changes, dont do requested change
        if(this.bufferingChanges) return;

        this.newHistoryItem();
        if(!this.changeBuffer) return;

        this.changeCallbackRefs.forEach((changeCallbackRef) => {
            const [changeType, id] = changeCallbackRef;
            const nextValue = this.valueGettersByType[changeType](id);
            this.change(changeCallbackRef, nextValue, this.changeBuffer as HistoryPatch);
        });
        this.changeBuffer = undefined;
    };

    change = (
        changeCallbackRef: ChangeCallbackRef,
        nextValue: unknown,
        patches: HistoryPatch
    ): void => {
        // only update a callback if it is not equal to the previous value
        const [,, changeCallback, prevValue] = changeCallbackRef;
        if(!Object.is(nextValue, prevValue)) {
            changeCallback(nextValue, {patches});
            changeCallbackRef[3] = nextValue;
        }
    };

    //
    // history
    //

    historyIndex = 0;
    historyStack: HistoryItem[] = [];
    historyLimit: number;
    historyState: HistoryState = {canUndo: false, canRedo: false};

    historyPush = (historyItem: HistoryItem) => {
        this.historyStack.length = this.historyIndex;
        this.historyStack.push(historyItem);

        if(this.historyStack.length > this.historyLimit) {
            this.historyStack.shift();
        } else {
            this.historyIndex++;
        }
        this.updateHistoryState();
    };

    historyReplace = (historyItem: HistoryItem) => {
        if(this.historyIndex === 0) return;
        this.historyStack.length = this.historyIndex;

        const last = this.historyStack[this.historyIndex - 1];

        this.historyStack[this.historyIndex - 1] = {
            do: {
                value: last.do.value.concat(historyItem.do.value),
                nodes: last.do.nodes.concat(historyItem.do.nodes)
            },
            undo: {
                value: historyItem.undo.value.concat(last.undo.value),
                nodes: historyItem.undo.nodes.concat(last.undo.nodes)
            }
        };
    };

    going = false;

    go = (offset: number): void => {
        if(offset === 0 || this.going) return;

        this.going = true;

        const newIndex = Math.min(
            Math.max(0, this.historyIndex + offset),
            this.historyStack.length
        );

        const historyPatches: HistoryPatch[] = offset > 0
            ? this.historyStack
                .slice(this.historyIndex, newIndex)
                .map(item => item.do)
            : this.historyStack.slice(newIndex, this.historyIndex)
                .reverse()
                .map(item => item.undo);

        const buffer: HistoryPatch = emptyHistoryPatch();
        historyPatches.forEach((thisPatch) => {
            buffer.value.push(...thisPatch.value);
            buffer.nodes.push(...thisPatch.nodes);
        });

        this.historyIndex = newIndex;

        this.updateHistoryState();

        // apply changes to .value and .nodes
        this.applyChanges(buffer);

        // call derive callbacks
        this.callAllDeriveCallbacks(offset, false);

        // call change callbacks
        this.callAllChangeCallbacks();

        this.going = false;
    };

    updateHistoryState = () => {
        const canUndo = this.historyIndex > 0;
        const canRedo = this.historyIndex < this.historyStack.length;
        if(canUndo !== this.historyState.canUndo || canRedo !== this.historyState.canRedo) {
            this.historyState = {canUndo, canRedo};
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
        id: string;
    };
};

type Renderer<D> = (form: D) => React.ReactElement;

type ChildToProduce<V> = (key: PropertyKey) => ToProduce<V>;

type KeyMap<M extends Map<unknown, unknown>> = M extends Map<infer K, unknown> ? K : never;
type ValMap<A> = A extends Map<unknown, infer V> ? V : never;

type Key<V> = V extends Map<unknown, unknown> ? KeyMap<V> : keyof V;
type Val<V,K> = V extends Map<unknown, unknown> ? ValMap<V> : K extends keyof V ? V[K] : never;

export class Dendriform<V,C=V> {

    // dev notes:
    // the dendriform class is merely a fancy way to get and set data
    // Dendriform instances should never be stateful
    // only Core should be stateful
    // hooks provided by Dendriform can obviously be stateful

    core: Core<C>;
    id: string;

    constructor(initialValue: V|DendriformBranch<C>, options: Options = {}) {

        // if branching off an existing form, pass id and core along
        if(initialValue instanceof Object && (initialValue as DendriformBranch<C>).__branch) {
            const {__branch} = initialValue as DendriformBranch<C>;
            this.core = __branch.core;
            this.id = __branch.id;
            return;
        }

        // if not branch off an existing form, make a core
        this.id = '0';
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

    get index(): number {
        return this.core.getIndex(this.id);
    }

    get history(): HistoryState {
        return this.core.historyState;
    }

    // must be an arrow function as this is plucked off the Dendriform instances when used via useValue()
    set = (toProduce: ToProduce<V>): void => {
        this.core.set(this.id, toProduce);
    };

    setParent = (childToProduce: ChildToProduce<unknown>): void => {
        const basePath = this.core.getPathOrError(this.id);
        const parent = this.core.getFormAt(basePath.slice(0,-1));
        this.core.set(parent.id, childToProduce(basePath[basePath.length - 1]));
    };

    onChange(callback: ChangeCallback<number>, changeType: ChangeTypeIndex): (() => void);
    onChange(callback: ChangeCallback<HistoryState>, changeType: ChangeTypeHistory): (() => void);
    onChange(callback: ChangeCallback<V>, changeType?: ChangeTypeValue): (() => void);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    onChange(callback:any, changeType: any): any {
        const changeCallback: ChangeCallbackRef = [changeType || 'value', this.id, callback, this.value];
        this.core.changeCallbackRefs.add(changeCallback);
        // return unsubscriber
        return () => void this.core.changeCallbackRefs.delete(changeCallback);
    }

    onDerive(callback: DeriveCallback<V>): (() => void) {
        const deriveCallback: DeriveCallbackRef = [callback];
        this.core.deriveCallbackRefs.add(deriveCallback);

        // call immediately, and dont add to history
        this.core.derive(deriveCallback, 0, true);
        this.core.callAllChangeCallbacks();

        // return unsubscriber
        return () => void this.core.deriveCallbackRefs.delete(deriveCallback);
    }

    undo = (): void => this.core.go(-1);

    redo = (): void => this.core.go(1);

    go = (offset: number): void => this.core.go(offset);

    replace = (replace = true): void => this.core.replace(replace);

    buffer = (): void => this.core.buffer();

    done = (): void => this.core.done();

    //
    // hooks
    //

    useValue(): V {
        const [value, setValue] = useState<V>(() => this.value);
        this.useChange(setValue);
        return value;
    }

    useIndex(): number {
        const [index, setIndex] = useState<number>(() => this.core.getIndex(this.id));
        this.useChange(setIndex, 'index');
        return index;
    }

    useChange(callback: ChangeCallback<number>, changeType: ChangeTypeIndex): void;
    useChange(callback: ChangeCallback<HistoryState>, changeType: ChangeTypeHistory): void;
    useChange(callback: ChangeCallback<V>, changeType?: ChangeTypeValue): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    useChange(callback: any, changeType: any): any {
        useEffect(() => this.onChange(callback, changeType || 'value'), []);
    }

    useDerive(callback: DeriveCallback<V>): void {
        useEffect(() => this.onDerive(callback), []);
    }

    useHistory(): HistoryState {
        const [historyState, setHistoryState] = useState<HistoryState>(this.core.historyState);
        this.useChange(setHistoryState, 'history');
        return historyState;
    }

    //
    // branching
    //

    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4],C>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>,C>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2]): Dendriform<Val<Val<V,K1>,K2>,C>;
    branch<K1 extends Key<V>>(path: [K1]): Dendriform<Val<V,K1>,C>;
    branch(path?: []): Dendriform<V,C>;
    branch<K1 extends Key<V>>(key: K1): Dendriform<Val<V,K1>,C>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branch(pathOrKey: any): any {
        const appendPath = ([] as Path).concat(pathOrKey ?? []);
        const basePath = this.core.getPathOrError(this.id);
        return this.core.getFormAt(basePath.concat(appendPath));
    }

    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4] & unknown[]>(path: [K1, K2, K3, K4]): Dendriform<W[0],C>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3> & unknown[]>(path: [K1, K2, K3]): Dendriform<W[0],C>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2> & unknown[]>(path: [K1, K2]): Dendriform<W[0],C>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1> & unknown[]>(path: [K1]): Dendriform<W[0],C>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1> & unknown[]>(key: K1): Dendriform<W[0],C>[];
    branchAll<W extends V & unknown[]>(path?: []): Dendriform<W[0],C>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branchAll(pathOrKey: any): any {
        const got = this.branch(pathOrKey);
        const array = got.value;
        if(!Array.isArray(array)) die(2);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return array.map((_element, index) => got.branch(index as any));
    }

    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4],C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>,C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2], renderer: Renderer<Dendriform<Val<Val<V,K1>,K2>,C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(path: [K1], renderer: Renderer<Dendriform<Val<V,K1>,C>>, deps?: unknown[]): React.ReactElement;
    render(path: [], renderer: Renderer<Dendriform<V,C>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(key: K1, renderer: Renderer<Dendriform<Val<V,K1>,C>>, deps?: unknown[]): React.ReactElement;
    render(renderer: Renderer<Dendriform<V,C>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,  @typescript-eslint/explicit-module-boundary-types
    render(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);
        return <Branch renderer={() => renderer(form)} deps={deps} />;
    }

    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4] & unknown[]>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3> & unknown[]>(path: [K1, K2, K3], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2> & unknown[]>(path: [K1, K2], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1> & unknown[]>(path: [K1], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & unknown[]>(path: [], renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1> & unknown[]>(key: K1, renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & unknown[]>(renderer: Renderer<Dendriform<W[0],C>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    renderAll(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);

        const containerRenderer = (): React.ReactElement[] => {
            const array = form.useValue();
            if(!Array.isArray(array)) die(3);

            return array.map((_element, index): React.ReactElement => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const child = form.branch(index as any);
                return <Branch key={child.id} renderer={() => renderer(child)} deps={deps} />;
            });
        };

        return <Branch renderer={containerRenderer} deps={deps} />;
    }
}

//
// useDendriform
//

type UseDendriformValue<V> = (() => V)|V;

export const useDendriform = <V,C=V>(initialValue: UseDendriformValue<V>, options: Options = {}): Dendriform<V,C> => {
    const [form] = useState(() => {
        const value = typeof initialValue === 'function'
            ? (initialValue as (() => V))()
            : initialValue;

        return new Dendriform<V,C>(value as V, options);
    });
    return form;
};
