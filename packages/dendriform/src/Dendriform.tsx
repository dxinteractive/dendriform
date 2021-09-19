
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
import {getIn, entries, applyPatches, zoomOutPatches, SET} from 'dendriform-immer-patch-optimiser';
import type {DendriformPatch, Path} from 'dendriform-immer-patch-optimiser';
import produce, {isDraft, original} from 'immer';
import {producePatches} from './producePatches';
import type {ToProduce} from './producePatches';
import {die} from './errors';
import type {ErrorKey} from './errors';
import {newNode, addNode, getPath, getNodeByPath, produceNodePatches, getNode} from './Nodes';
import type {Nodes, NodeAny, NewNodeCreator} from './Nodes';

//
// cancel
//

class Cancel extends Error {
    DENDRIFORM_CANCEL = true;
}

export const cancel = (message: string): Cancel => new Cancel(message);

//
// core
//

export type HistoryItem = {
    do: HistoryPatch;
    undo: HistoryPatch;
};

export type HistoryPatch = {
    value: DendriformPatch[];
    nodes: DendriformPatch[];
};

export type HistoryState = {
    canUndo: boolean;
    canRedo: boolean;
};

export type ChangeCallbackDetails = {
    patches: HistoryPatch
};
export type ChangeCallback<V> = (newValue: V, details: ChangeCallbackDetails) => void;
export type ChangeTypeValue = 'value';
export type ChangeTypeIndex = 'index';
export type ChangeTypeHistory = 'history';
export type ChangeType = ChangeTypeValue|ChangeTypeIndex|ChangeTypeHistory;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChangeCallbackRef = [ChangeType, string, ChangeCallback<any>, any];

export type DeriveCallbackDetails = {
    go: number;
    replace: boolean;
    force: boolean;
    patches: HistoryPatch
};
export type DeriveCallback<V> = (newValue: V, details: DeriveCallbackDetails) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeriveCallbackRef = [DeriveCallback<any>];

export type CancelCallback = (message: string) => void;

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

type State<C> = {
    // value
    value: C;
    // nodes
    nodes: Nodes;
    nodeCount: number;
    // history
    historyIndex: number;
    historyStack: HistoryItem[];
    historyState: HistoryState;
};

type InternalState = {
    // user controlled internal state
    bufferingChanges: boolean;
    // if setBuffer exists, then new changes will be merged onto it
    // if not, a new change will push a new history item
    setBuffer?: HistoryPatch;
    // state during changes
    changeBuffer?: HistoryPatch;
    deriving: boolean;
    going: boolean;
};

const emptyHistoryPatch = (): HistoryPatch => ({value: [], nodes: []});

export class Core<C> {

    //
    // state
    //

    // persistent state - value, nodes, history...
    state: State<C>;
    // internal state - push or replace etc...
    internalState: InternalState;
    // revert
    stateRevert: State<C>|undefined;
    internalStateRevert: InternalState|undefined;

    //
    // config
    //

    historyLimit: number;
    replaceByDefault: boolean;

    //
    // internal collections
    //

    // cached Dendriform instances
    dendriforms = new Map<string,Dendriform<unknown>>();
    // derive callback refs, will be called while values are changing and require data to be derived
    deriveCallbackRefs = new Set<DeriveCallbackRef>();
    // change callback refs, will be called when values are to be pushed out to subscribers
    changeCallbackRefs = new Set<ChangeCallbackRef>();
    // cancel callback refs, will be called when a change is cancelled
    cancelCallbacks = new Set<CancelCallback>();
    // set of forms currently hvaing their set() functions called
    static changingForms = new Set<Core<unknown>>();
    // debounce ids and count numbers to identify when each id has debounced
    debounceMap = new Map<string,number>();

    //
    // node counter
    //

    newNodeCreator: NewNodeCreator;

    //
    // constructor
    //

    constructor(config: CoreConfig<C>) {

        this.state = {
            // value - the .value stored in the form
            value: config.initialValue,
            // nodes - responsible for id-ing data pieces within the value tree
            // makes it possible to uniquely id parts of a data shape, even while paths change
            nodes: {},
            nodeCount: 0,
            // history
            historyIndex: 0,
            historyStack: [],
            historyState: {
                canUndo: false,
                canRedo: false
            }
        };

        this.internalState = {
            // user controlled internal state
            bufferingChanges: false,
            // if setBuffer exists, then new changes will be merged onto it
            // if not, a new change will push a new history item
            setBuffer: undefined,
            // state during changes
            changeBuffer: undefined,
            deriving: false,
            going: false
        };

        this.newNodeCreator = newNode(() => `${this.state.nodeCount++}`);

        // create a root node for the value
        addNode(this.state.nodes, this.newNodeCreator(this.state.value));

        this.historyLimit = config.options.history || 0;
        this.replaceByDefault = !!config.options.replace;
    }

    //
    // data access
    //

    getPath = (id: string): Path|undefined => {
        return getPath(this.state.nodes, id);
    };

    getPathOrError = (id: string): Path => {
        const path = this.getPath(id);
        if(!path) die(0, id);
        return path;
    };

    getValue = (id: string): unknown => {
        const path = this.getPath(id);
        if(!path) return undefined;
        return getIn(this.state.value, path);
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
        history: (_id) => this.state.historyState
    };

    createForm = (id: string): Dendriform<unknown> => {
        const __branch = {core: this, id};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = new Dendriform<any>({__branch});
        this.dendriforms.set(id, form);
        return form;
    };

    getFormAt = (path: Path|undefined): Dendriform<unknown> => {
        let node: NodeAny|undefined;

        if(path) {
            this.state.nodes = produce(this.state.nodes, draft => {
                const found = getNodeByPath(draft, this.newNodeCreator, this.state.value, path);
                node = isDraft(found) ? original(found) : found;
            });
        }

        const id = node ? node.id : 'notfound';
        return this.dendriforms.get(id) || this.createForm(id);
    };

    //
    // setting data
    //

    setWithDebounce = (id: string, toProduce: unknown, options: SetOptions): void => {
        const {debounce} = options;
        if(!debounce) {
            this.set(id, toProduce, options);
            return;
        }

        const countAtCall = (this.debounceMap.get(id) ?? 0) + 1;
        this.debounceMap.set(id, countAtCall);
        setTimeout(() => countAtCall === this.debounceMap.get(id) && this.set(id, toProduce, options), debounce);
    };

    executeChange = (executor: () => void): void => {
        const originator = Core.changingForms.size === 0;
        try {
            // add form to the set of forms that are currently undergoing a change
            Core.changingForms.add(this);

            // set revert point to restore state from here if change is cancelled
            this.setRevertPoint();

            // call executor to make the changes
            executor();

            // call all change callbacks involved in this form and clear revert points
            if(originator) {
                Core.changingForms.forEach(form => form.callChangeCallbacks());
            }
            // this.callChangeCallbacks();

            // all forms are done changing, clear the set and revert points
            if(originator) {
                this.finaliseChange();
            }

        } catch(e) {
            // if not the originator, keep throwing all errors up
            // the originator will handle them
            if(!originator) {
                throw e;
            }

            // if the originator but error is not a cancel
            // close off the change and throw the error further up
            if(!e.DENDRIFORM_CANCEL) {
                this.finaliseChange();
                throw e;
            }

            // error is a revert
            Core.changingForms.forEach(core => core.revert());

            // call all revert callbacks
            this.cancelCallbacks.forEach(cancelCallback => cancelCallback(e.message));
            this.finaliseChange();
        }
    };

    finaliseChange = (): void => {
        Core.changingForms.forEach(form => form.clearRevertPoint());
        Core.changingForms.clear();
    };

    set = (id: string, toProduce: unknown, options: SetOptions): void => {
        const path = this.getPath(id);
        // do nothing if this set is not valid due to the node not being part of the node tree anymore
        if(!path) return;

        // error if this set is attempted on the child of an es6 Set
        const parentId = getNode(this.state.nodes, id)?.parentId;
        if(parentId && getNode(this.state.nodes, parentId)?.type === SET) die(7);

        // execute change
        this.executeChange(() => {
            // produce patches that describe the change
            const [valuePatches, valuePatchesInv] = producePatches(this.getValue(id), toProduce, options.track);

            // transform patches so they have absolute paths
            const valuePatchesZoomed = zoomOutPatches(path, valuePatches);
            const valuePatchesInvZoomed = zoomOutPatches(path, valuePatchesInv);

            // produce node patches, so that changes in the value
            // are accompanied by corresponding changes in the nodes
            const [, nodesPatches, nodesPatchesInv] = produceNodePatches(
                this.state.nodes,
                this.newNodeCreator,
                this.state.value,
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
            if(this.internalState.going || this.internalState.deriving) return;

            // push new history item, or replace last history item
            const replace = !!this.internalState.setBuffer;
            if(replace) {
                this.historyReplace(historyItem);
            } else {
                this.historyPush(historyItem);
            }

            this.internalState.setBuffer = {
                value: (this.internalState.setBuffer?.value || []).concat(historyItem.do.value),
                nodes: (this.internalState.setBuffer?.nodes || []).concat(historyItem.do.nodes)
            };

            // call derive callbacks
            // but only if there are changes, or else this may be a deliberate noChange
            // e.g. when sync() deliberately adds empty history items
            if(historyItem.do.value.length > 0) {
                this.callAllDeriveCallbacks(0, replace, options.force ?? false);
            }
        });
    };

    applyChanges = (historyPatch: HistoryPatch): void => {
        // apply changes to .value and .nodes
        this.state.value = applyPatches(this.state.value, historyPatch.value);
        this.state.nodes = applyPatches(this.state.nodes, historyPatch.nodes);

        // add changes to change buffer
        this.internalState.changeBuffer = {
            value: (this.internalState.changeBuffer?.value || []).concat(historyPatch.value),
            nodes: (this.internalState.changeBuffer?.nodes || []).concat(historyPatch.nodes)
        };
    };

    replace = (replace: boolean): void => {
        if(!replace) {
            this.internalState.setBuffer = undefined;
        } else if(!this.internalState.setBuffer) {
            this.internalState.setBuffer = emptyHistoryPatch();
        }
    };

    newHistoryItem = (): void => {
        this.internalState.setBuffer = this.replaceByDefault
            ? emptyHistoryPatch()
            : undefined;
    };

    //
    // derive
    //

    callAllDeriveCallbacks = (go: number, replace: boolean, force: boolean): void => {
        this.deriveCallbackRefs.forEach((deriveCallbackRef) => {
            this.derive(deriveCallbackRef, go, replace, force);
        });
    };

    derive = (
        deriveCallbackRef: DeriveCallbackRef,
        go: number,
        replace: boolean,
        force: boolean
    ): void => {
        if(this.internalState.deriving) return;
        this.internalState.deriving = true;

        const [deriveCallback] = deriveCallbackRef;
        const patches = this.internalState.changeBuffer ?? emptyHistoryPatch();
        deriveCallback(this.state.value, {go, replace, patches, force});
        this.internalState.deriving = false;
    };

    //
    // change
    //

    buffer = (): void => {
        this.internalState.bufferingChanges = true;
        this.newHistoryItem();
    };

    done = (): void => {
        this.internalState.bufferingChanges = false;
        this.callChangeCallbacks();
    };

    callChangeCallbacks = (): void => {
        // if buffering changes, dont do requested change
        if(this.internalState.bufferingChanges) return;

        this.newHistoryItem();
        if(!this.internalState.changeBuffer) return;

        this.changeCallbackRefs.forEach((changeCallbackRef) => {
            const [changeType, id] = changeCallbackRef;
            const nextValue = this.valueGettersByType[changeType](id);
            this.change(changeCallbackRef, nextValue, this.internalState.changeBuffer as HistoryPatch);
        });
        this.internalState.changeBuffer = undefined;
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

    historyPush = (historyItem: HistoryItem): void => {
        const newHistoryStack = this.state.historyStack
            .slice(0, this.state.historyIndex)
            .concat(historyItem);

        if(newHistoryStack.length > this.historyLimit) {
            newHistoryStack.shift();
        } else {
            this.state.historyIndex++;
        }
        this.state.historyStack = newHistoryStack;
        this.updateHistoryState();
    };

    historyReplace = (historyItem: HistoryItem): void => {
        if(this.state.historyIndex === 0) return;
        const newHistoryStack = this.state.historyStack
            .slice(0, this.state.historyIndex);

        const last = newHistoryStack[this.state.historyIndex - 1];

        newHistoryStack[this.state.historyIndex - 1] = {
            do: {
                value: last.do.value.concat(historyItem.do.value),
                nodes: last.do.nodes.concat(historyItem.do.nodes)
            },
            undo: {
                value: historyItem.undo.value.concat(last.undo.value),
                nodes: historyItem.undo.nodes.concat(last.undo.nodes)
            }
        };
        this.state.historyStack = newHistoryStack;
    };

    go = (offset: number): void => {
        if(offset === 0 || this.internalState.going) return;

        this.internalState.going = true;

        this.executeChange(() => {
            const newIndex = Math.min(
                Math.max(0, this.state.historyIndex + offset),
                this.state.historyStack.length
            );

            const historyPatches: HistoryPatch[] = offset > 0
                ? this.state.historyStack
                    .slice(this.state.historyIndex, newIndex)
                    .map(item => item.do)
                : this.state.historyStack.slice(newIndex, this.state.historyIndex)
                    .reverse()
                    .map(item => item.undo);

            const buffer: HistoryPatch = emptyHistoryPatch();
            historyPatches.forEach((thisPatch) => {
                buffer.value.push(...thisPatch.value);
                buffer.nodes.push(...thisPatch.nodes);
            });

            this.state.historyIndex = newIndex;

            this.updateHistoryState();

            // apply changes to .value and .nodes
            this.applyChanges(buffer);

            // call derive callbacks
            this.callAllDeriveCallbacks(offset, false, false);
        });

        this.internalState.going = false;
    };

    updateHistoryState = (): void => {
        const canUndo = this.state.historyIndex > 0;
        const canRedo = this.state.historyIndex < this.state.historyStack.length;
        if(canUndo !== this.state.historyState.canUndo || canRedo !== this.state.historyState.canRedo) {
            this.state.historyState = {canUndo, canRedo};
        }
    };

    //
    // revert
    //

    setRevertPoint = (): void => {
        this.stateRevert = {...this.state};
        this.internalStateRevert = {...this.internalState};
    };

    clearRevertPoint = (): void => {
        this.stateRevert = undefined;
        this.internalStateRevert = undefined;
    };

    revert = (): void => {
        if(this.stateRevert) {
            this.state = this.stateRevert;
        }
        if(this.internalStateRevert) {
            this.internalState = this.internalStateRevert;
        }
    };
}

//
// branch
//
// memoised component returned by Dendriform.branch()
// should only update based on deps (or based on own state changing)
//

type MaybeReactElement = React.ReactElement|null;

type BranchProps = {
    renderer: () => MaybeReactElement|MaybeReactElement[];
    deps: unknown[];
};

// eslint-disable-next-line react/display-name
const Branch = React.memo(
    // eslint-disable-next-line react/prop-types
    (props: BranchProps): React.ReactElement => <>{props.renderer()}</>,
    (prevProps, nextProps) => shallowEqualArrays(prevProps.deps, nextProps.deps)
);

const entriesOrDie = (thing: any, error: ErrorKey) => {
    try {
        return entries(thing);
    } catch(e) {
        die(error);
    }
};

//
// Dendriform
//
// (wrapper around core)
//

export type DendriformBranch = {
    __branch: {
        core: Core<unknown>;
        id: string;
    };
};

export type Renderer<D> = (form: D) => MaybeReactElement;

export type ChildToProduce<V> = (key: PropertyKey) => ToProduce<V>;

export type Key<V> = V extends Map<infer K, unknown> ? K
    : V extends Set<infer V> ? V
    : keyof V;

export type Val<V,K> = V extends Map<unknown, infer V> ? V
    : V extends Set<infer V> ? V
    : K extends keyof V ? V[K]
    : never;

type Branchable = unknown[]
    | Map<string,unknown>
    | Set<unknown>
    | {[key: string]: unknown};

type BranchableChild<A> = A extends unknown[] ? A[0]
    : A extends Map<any, infer V> ? V
    : A extends Set<infer V> ? V
    : A extends {[key: string]: infer V} ? V
    : never;

export type SetOptions = {
    debounce?: number;
    track?: boolean;
    force?: boolean;
};

export class Dendriform<V> {

    // dev notes:
    // the dendriform class is merely a fancy way to get and set data
    // Dendriform instances should never be stateful
    // only Core should be stateful
    // hooks provided by Dendriform can obviously be stateful

    core: Core<unknown>;
    id: string;

    constructor(initialValue: V|DendriformBranch, options: Options = {}) {

        // if branching off an existing form, pass id and core along
        if(initialValue instanceof Object && (initialValue as DendriformBranch).__branch) {
            const {__branch} = initialValue as DendriformBranch;
            this.core = __branch.core;
            this.id = __branch.id;
            return;
        }

        // if not branch off an existing form, make a core
        this.id = '0';
        this.core = new Core({
            initialValue,
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
        return this.core.state.historyState;
    }

    set = (toProduce: ToProduce<V>, options: SetOptions = {}): void => {
        this.core.setWithDebounce(this.id, toProduce, options);
    };

    setParent = (childToProduce: ChildToProduce<unknown>, options: SetOptions = {}): void => {
        const basePath = this.core.getPathOrError(this.id);
        const parent = this.core.getFormAt(basePath.slice(0,-1));
        this.core.setWithDebounce(parent.id, childToProduce(basePath[basePath.length - 1]), options);
    };

    onDerive(callback: DeriveCallback<V>): (() => void) {
        const deriveCallback: DeriveCallbackRef = [callback];
        this.core.deriveCallbackRefs.add(deriveCallback);

        // call immediately, and dont add to history
        try {
            this.core.derive(deriveCallback, 0, true, false);
        } catch(e) {
            die(6, '?');
        }
        this.core.callChangeCallbacks();

        // return unsubscriber
        return () => void this.core.deriveCallbackRefs.delete(deriveCallback);
    }

    onCancel(callback: CancelCallback): (() => void) {
        this.core.cancelCallbacks.add(callback);
        // return unsubscriber
        return () => void this.core.cancelCallbacks.delete(callback);
    }

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
        const [index, setIndex] = useState<number>(() => this.index);
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

    useCancel(callback: CancelCallback): void {
        useEffect(() => this.onCancel(callback), []);
    }

    useHistory(): HistoryState {
        const [historyState, setHistoryState] = useState<HistoryState>(this.core.state.historyState);
        this.useChange(setHistoryState, 'history');
        return historyState;
    }

    //
    // branching
    //

    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4]>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2]): Dendriform<Val<Val<V,K1>,K2>>;
    branch<K1 extends Key<V>>(path: [K1]): Dendriform<Val<V,K1>>;
    branch(path?: []): Dendriform<V>;
    branch<K1 extends Key<V>>(key: K1): Dendriform<Val<V,K1>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branch(pathOrKey: any): any {
        const appendPath = ([] as Path).concat(pathOrKey ?? []);
        const basePath = this.core.getPath(this.id);
        return this.core.getFormAt(basePath?.concat(appendPath));
    }

    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4] & Branchable>(path: [K1, K2, K3, K4]): Dendriform<BranchableChild<W>>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3> & Branchable>(path: [K1, K2, K3]): Dendriform<BranchableChild<W>>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2> & Branchable>(path: [K1, K2]): Dendriform<BranchableChild<W>>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1> & Branchable>(path: [K1]): Dendriform<BranchableChild<W>>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1> & Branchable>(key: K1): Dendriform<BranchableChild<W>>[];
    branchAll<W extends V & Branchable>(path?: []): Dendriform<BranchableChild<W>>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branchAll(pathOrKey: any): any {
        const got = this.branch(pathOrKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return entriesOrDie(got.value, 2).map(([key]) => {
            return got.branch(key as any);
        });
    }

    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4]>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2], renderer: Renderer<Dendriform<Val<Val<V,K1>,K2>>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(path: [K1], renderer: Renderer<Dendriform<Val<V,K1>>>, deps?: unknown[]): React.ReactElement;
    render(path: [], renderer: Renderer<Dendriform<V>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(key: K1, renderer: Renderer<Dendriform<Val<V,K1>>>, deps?: unknown[]): React.ReactElement;
    render(renderer: Renderer<Dendriform<V>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,  @typescript-eslint/explicit-module-boundary-types
    render(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);
        return <Branch renderer={() => renderer(form)} deps={deps} />;
    }

    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4] & Branchable>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3> & Branchable>(path: [K1, K2, K3], renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2> & Branchable>(path: [K1, K2], renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1> & Branchable>(path: [K1], renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & Branchable>(path: [], renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1> & Branchable>(key: K1, renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V & Branchable>(renderer: Renderer<Dendriform<BranchableChild<W>>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    renderAll(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);

        const containerRenderer = (): React.ReactElement[] => {
            const value = form.useValue();
            return entriesOrDie(value, 3).map(([key]): React.ReactElement => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const child = form.branch(key as any);
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

export const useDendriform = <V,>(initialValue: UseDendriformValue<V>, options: Options = {}): Dendriform<V> => {
    const [form] = useState(() => {
        const value = typeof initialValue === 'function'
            ? (initialValue as (() => V))()
            : initialValue;

        return new Dendriform<V>(value as V, options);
    });
    return form;
};
