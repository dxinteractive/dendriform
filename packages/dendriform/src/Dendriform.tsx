
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
import {useState, useEffect, useRef} from 'react';
import {shallowEqualArrays} from 'shallow-equal';
import {getIn, getType, entries, applyPatches, zoomOutPatches, SET, BASIC} from 'dendriform-immer-patch-optimiser';
import type {Path} from 'dendriform-immer-patch-optimiser';
import produce, {isDraft, original} from 'immer';
import {producePatches, Patch} from './producePatches';
import type {ToProduce} from './producePatches';
import {die} from './errors';
import type {ErrorKey} from './errors';
import {newNode, addNode, getPath, getNodeByPath, produceNodePatches, getNode} from './Nodes';
import type {Nodes, NodeAny, NewNodeCreator} from './Nodes';
import type {Plugin} from './Plugin';

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

export class HistoryItem {
    do: Patch = new Patch();
    undo: Patch = new Patch();

    static concat(itemA: HistoryItem|undefined, itemB: HistoryItem|undefined): HistoryItem {
        const next = new HistoryItem();
        next.do = Patch.concat(itemA?.do, itemB?.do);
        next.undo = Patch.concat(itemB?.undo, itemA?.undo);
        return next;
    }

    static flatten(historyItems: HistoryItem[]): HistoryItem {
        return historyItems.reduce(HistoryItem.concat, new HistoryItem());
    }

    reverse(): HistoryItem {
        const next = new HistoryItem();
        next.do = this.undo;
        next.undo = this.do;
        return next;
    }
}

export type HistoryState = {
    canUndo: boolean;
    canRedo: boolean;
};

export type StateDiff<V,N> = {
    value: V;
    nodes: N;
};

export type InternalMetaDetails = {
    go: number;
    replace: boolean;
    force: boolean;
};

export type ChangeCallbackDetails<V> = InternalMetaDetails & {
    patches: HistoryItem;
    prev: StateDiff<V|undefined,Nodes|undefined>;
    next: StateDiff<V,Nodes>;
    id: string;
};
export type ChangeCallback<V> = (newValue: V, details: ChangeCallbackDetails<V>) => void;
export type ChangeTypeValue = 'value';
export type ChangeTypeIndex = 'index';
export type ChangeTypeHistory = 'history';
export type ChangeType = ChangeTypeValue|ChangeTypeIndex|ChangeTypeHistory;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ChangeCallbackRef = [ChangeType, string, ChangeCallback<any>, any];

export type DeriveCallbackDetails<V> = InternalMetaDetails & {
    patches: HistoryItem;
    prev: StateDiff<V|undefined,Nodes|undefined>;
    next: StateDiff<V,Nodes>;
    id: string;
};
export type DeriveCallback<V> = (newValue: V, details: DeriveCallbackDetails<V>) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeriveCallbackRef = [DeriveCallback<any>];

export type CancelCallback = (message: string) => void;

//
// core
//

export type Plugins = {[key: string]: Plugin}|undefined;

export type Options<P extends Plugins> = {
    history?: number;
    replace?: boolean;
    plugins?: P;
};

export type UseDendriformOptions<P extends Plugins> = {
    history?: number;
    replace?: boolean;
    plugins?: () => P;
    dependencies?: unknown[];
};

export type CoreConfig<C,P extends Plugins> = {
    initialValue: C;
    options: Options<P>;
};

export type State<C> = {
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

export type InternalState = {
    // user controlled internal state
    bufferingChanges: boolean;
    // if setBuffer exists, then new changes will be merged onto it
    // if not, a new change will push a new history item
    setBuffer?: Patch;
    // state during changes
    changeBuffer?: HistoryItem;
    deriving: boolean;
    going: boolean;
};

export class Core<C,P extends Plugins> {

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
    prevNodes: Nodes;

    //
    // config
    //

    historyLimit: number;
    replaceByDefault: boolean;
    plugins: P|undefined;

    //
    // internal collections
    //

    // cached Dendriform instances
    dendriforms = new Map<string,Dendriform<unknown,P>>();
    // derive callback refs, will be called while values are changing and require data to be derived
    deriveCallbackRefs = new Set<DeriveCallbackRef>();
    // change callback refs, will be called when values are to be pushed out to subscribers
    changeCallbackRefs = new Set<ChangeCallbackRef>();
    // cancel callback refs, will be called when a change is cancelled
    cancelCallbacks = new Set<CancelCallback>();
    // set of forms currently hvaing their set() functions called
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static changingForms = new Set<Core<unknown,any>>();
    // debounce ids and count numbers to identify when each id has debounced
    debounceMap = new Map<string,number>();

    //
    // node counter
    //

    newNodeCreator: NewNodeCreator;

    //
    // constructor
    //

    constructor(config: CoreConfig<C,P>) {

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

        this.prevNodes = this.state.nodes;

        this.historyLimit = config.options.history || 0;
        this.replaceByDefault = !!config.options.replace;
        this.plugins = config.options.plugins;
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

    getKey = (id: string): unknown => {
        const path = this.getPath(id);
        return path ? path.slice(-1)[0] : undefined;
    };

    getIndex = (id: string): number => {
        const path = this.getPath(id);
        console.log('this.state.nodes', this.state.nodes);
        console.log('path', id, path);
        const key =  path ? path.slice(-1)[0] : -1;
        if(typeof key !== 'number') die(4, path);
        return key;
    };

    valueGettersByType: {[key in ChangeType]: (id: string) => unknown} = {
        value: this.getValue,
        index: this.getIndex,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        history: (_id) => this.state.historyState
    };

    createForm = (id: string, readonly: boolean): Dendriform<unknown,P> => {
        const __branch = {core: this, id};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const form = new Dendriform<any,P>({__branch});
        this.dendriforms.set(`${readonly ? 'r' : 'w'}${id}`, form);
        return form;
    };

    getFormAt = (path: Path|undefined, readonly: boolean): Dendriform<unknown,P> => {
        let node: NodeAny|undefined;

        if(path) {
            this.state.nodes = produce(this.state.nodes, draft => {
                const found = getNodeByPath(draft, this.newNodeCreator, this.state.value, path);
                node = isDraft(found) ? original(found) : found;
            });
        }

        const id = node ? node.id : 'notfound';
        return this.getFormById(id, readonly);
    };

    getFormById = (id: string, readonly: boolean): Dendriform<unknown,P> => {
        const form = this.dendriforms.get(`${readonly ? 'r' : 'w'}${id}`) || this.createForm(id, readonly);
        form._readonly = readonly;
        return form;
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

    executeChange = (executor: () => void, internalMeta: InternalMetaDetails): void => {
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
                // clear the changing forms set before calling callbacks
                // so any calls to .set in callbacks start a new change
                const forms = Array.from(Core.changingForms.values());
                this.finaliseChange();

                forms.forEach(form => form.callAllChangeCallbacks(internalMeta));
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
        const prevNodes = this.stateRevert?.nodes;
        if(prevNodes) {
            this.prevNodes = prevNodes;
        }
        Core.changingForms.forEach(form => form.clearRevertPoint());
        Core.changingForms.clear();
    };

    set = (id: string, toProduce: unknown, options: SetOptions): void => {
        const internalMeta = {
            go: 0,
            replace: !!this.internalState.setBuffer,
            force: options.force ?? false
        };

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
            const historyItem = new HistoryItem();
            historyItem.do.value = valuePatchesZoomed;
            historyItem.do.nodes = nodesPatches;
            historyItem.undo.value = valuePatchesInvZoomed;
            historyItem.undo.nodes = nodesPatchesInv;

            // apply changes to .value and .nodes
            this.applyChanges(historyItem);

            // if we're in the middle of calling go() or deriving, dont bother with buffers or deriving
            // derived data shouldn't end up in the history stack, it should always be re-derived
            if(this.internalState.going || this.internalState.deriving) return;

            // push new history item, or replace last history item
            if(internalMeta.replace) {
                this.historyReplace(historyItem);
            } else {
                this.historyPush(historyItem);
            }

            this.internalState.setBuffer = Patch.concat(this.internalState.setBuffer, historyItem.do);

            // call derive callbacks
            // but only if there are changes, or else this may be a deliberate noChange
            // e.g. when sync() deliberately adds empty history items
            if(historyItem.do.value.length > 0) {
                this.callAllDeriveCallbacks(internalMeta);
            }
        }, internalMeta);
    };

    applyChanges = (historyItem: HistoryItem): void => {
        // apply changes to .value and .nodes
        this.state.value = applyPatches(this.state.value, historyItem.do.value);
        this.state.nodes = applyPatches(this.state.nodes, historyItem.do.nodes);

        // add changes to change buffer
        this.internalState.changeBuffer = HistoryItem.concat(this.internalState.changeBuffer, historyItem);
    };

    replace = (replace: boolean): void => {
        if(!replace) {
            this.internalState.setBuffer = undefined;
        } else if(!this.internalState.setBuffer) {
            this.internalState.setBuffer = new Patch();
        }
    };

    newHistoryItem = (): void => {
        this.internalState.setBuffer = this.replaceByDefault
            ? new Patch()
            : undefined;
    };

    //
    // derive
    //

    callAllDeriveCallbacks = (internalMeta: InternalMetaDetails): void => {
        this.deriveCallbackRefs.forEach((deriveCallbackRef) => {
            this.derive(deriveCallbackRef, internalMeta);
        });
    };

    derive = (deriveCallbackRef: DeriveCallbackRef, internalMeta: InternalMetaDetails): void => {
        if(this.internalState.deriving) return;
        this.internalState.deriving = true;

        const [deriveCallback] = deriveCallbackRef;
        const patches = this.internalState.changeBuffer ?? new HistoryItem();

        const details = {
            ...internalMeta,
            patches,
            prev: {
                value: this.stateRevert?.value,
                nodes: this.stateRevert?.nodes
            },
            next: {
                value: this.state.value,
                nodes: this.state.nodes
            },
            id: '0'
        };

        deriveCallback(this.state.value, details);
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
        const internalMeta = {
            go: 0,
            replace: false,
            force: false
        };
        this.callAllChangeCallbacks(internalMeta);
    };

    callAllChangeCallbacks = (internalMeta: InternalMetaDetails): void => {
        // if buffering changes, dont do requested change
        if(this.internalState.bufferingChanges) return;

        this.newHistoryItem();
        if(!this.internalState.changeBuffer) return;

        this.changeCallbackRefs.forEach((changeCallbackRef) => {
            const [changeType, id, changeCallback, prevValue] = changeCallbackRef;
            const nextValue = this.valueGettersByType[changeType](id);
            console.log('nextValue', nextValue);

            // only update a callback if it is not equal to the previous value
            if(!Object.is(nextValue, prevValue)) {
                const patches = this.internalState.changeBuffer as HistoryItem;

                const details = {
                    ...internalMeta,
                    patches,
                    prev: {
                        value: prevValue,
                        nodes: this.prevNodes
                    },
                    next: {
                        value: nextValue,
                        nodes: this.state.nodes
                    },
                    id
                };

                changeCallbackRef[3] = nextValue;
                changeCallback(nextValue, details);
            }
        });
        this.internalState.changeBuffer = undefined;
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
        newHistoryStack[this.state.historyIndex - 1] = HistoryItem.concat(last, historyItem);
        this.state.historyStack = newHistoryStack;
    };

    go = (offset: number): void => {
        const internalMeta = {
            go: offset,
            replace: false,
            force: false
        };

        if(offset === 0 || this.internalState.going) return;

        this.internalState.going = true;

        this.executeChange(() => {
            const newIndex = Math.min(
                Math.max(0, this.state.historyIndex + offset),
                this.state.historyStack.length
            );

            const historyItems: HistoryItem[] = offset > 0
                ? this.state.historyStack
                    .slice(this.state.historyIndex, newIndex)
                : this.state.historyStack.slice(newIndex, this.state.historyIndex)
                    .reverse()
                    .map(item => item.reverse());

            const historyItem = HistoryItem.flatten(historyItems);

            this.state.historyIndex = newIndex;
            this.updateHistoryState();

            // apply changes to .value and .nodes
            this.applyChanges(historyItem);

            // call derive callbacks
            this.callAllDeriveCallbacks(internalMeta);
        }, internalMeta);

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

    //
    // plugins
    //

    applyIdToPlugins(id: string, path: Path): P {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applied: any = {};
        for(const key in this.plugins) {
            applied[key] = this.plugins[key].cloneAndSpecify(id, path);
        }
        return applied as P;
    }
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const branchable = (thing: any) => getType(thing) !== BASIC;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export type DendriformBranch<P extends Plugins> = {
    __branch: {
        core: Core<unknown,P>;
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

export type BranchableChild<A> = A extends unknown[] ? A[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    : A extends Map<any, infer V> ? V
    : A extends Set<infer V> ? V
    : A extends {[key: string]: infer V} ? V
    : never;

export type SetOptions = {
    debounce?: number;
    track?: boolean;
    force?: boolean;
};

export class Dendriform<V,P extends Plugins = undefined> {

    // dev notes:
    // the dendriform class is merely a fancy way to get and set data
    // Dendriform instances should never be stateful
    // only Core should be stateful
    // hooks provided by Dendriform can obviously be stateful

    core: Core<unknown,P>;
    id: string;
    _readonly = false;

    constructor(initialValue: V|DendriformBranch<P>, options: Options<P> = {}) {

        // if branching off an existing form, pass id and core along
        if(initialValue instanceof Object && (initialValue as DendriformBranch<P>).__branch) {
            const {__branch} = initialValue as DendriformBranch<P>;
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

        // intialise plugins
        const {plugins} = options;
        if(plugins) {
            for(const key in plugins) {
                plugins[key].init(this);
            }
        }
    }

    //
    // private methods
    //

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _addChangeCallback(callback: ChangeCallback<any>, type: ChangeType): (() => void) {
        const changeCallback: ChangeCallbackRef = [type, this.id, callback, this.value];
        this.core.changeCallbackRefs.add(changeCallback);
        return () => void this.core.changeCallbackRefs.delete(changeCallback);
    }

    //
    // public api
    //

    get value(): V {
        return this.core.getValue(this.id) as V;
    }

    get key(): unknown {
        // this is typed as unknown for now
        // in future we could use generics to work out what the key is
        // but the order of generics in the Dendriform type is not yet decided
        return this.core.getKey(this.id);
    }

    get path(): Path {
        return this.core.getPathOrError(this.id);
    }

    get index(): number {
        return this.core.getIndex(this.id);
    }

    get history(): HistoryState {
        return this.core.state.historyState;
    }

    get plugins(): P {
        return this.core.applyIdToPlugins(this.id, this.path) as P;
    }

    get branchable(): boolean {
        return branchable(this.value);
    }

    set = (toProduce: ToProduce<V>, options: SetOptions = {}): void => {
        if(this._readonly) die(9);
        this.core.setWithDebounce(this.id, toProduce, options);
    };

    setParent = (childToProduce: ChildToProduce<unknown>, options: SetOptions = {}): void => {
        if(this._readonly) die(9);
        const basePath = this.core.getPathOrError(this.id);
        const parent = this.core.getFormAt(basePath.slice(0,-1), this._readonly);
        this.core.setWithDebounce(parent.id, childToProduce(basePath[basePath.length - 1]), options);
    };

    onDerive(callback: DeriveCallback<V>): (() => void) {
        const deriveCallback: DeriveCallbackRef = [callback];
        this.core.deriveCallbackRefs.add(deriveCallback);

        // call immediately, and dont add to history
        const internalMeta = {
            go: 0,
            replace: true,
            force: false
        };

        try {
            this.core.derive(deriveCallback, internalMeta);
        } catch(e) {
            die(6, e.message);
        }
        this.core.callAllChangeCallbacks(internalMeta);

        // return unsubscriber
        return () => void this.core.deriveCallbackRefs.delete(deriveCallback);
    }

    onCancel(callback: CancelCallback): (() => void) {
        this.core.cancelCallbacks.add(callback);
        // return unsubscriber
        return () => void this.core.cancelCallbacks.delete(callback);
    }

    onChange(callback: ChangeCallback<V>): (() => void) {
        return this._addChangeCallback(callback, 'value');
    }

    onChangeIndex(callback: ChangeCallback<number>): (() => void) {
        return this._addChangeCallback(callback, 'index');
    }

    onChangeHistory(callback: ChangeCallback<HistoryState>): (() => void) {
        return this._addChangeCallback(callback, 'history');
    }

    undo = (): void => this.go(-1);

    redo = (): void => this.go(1);

    go = (offset: number): void => {
        if(this._readonly) die(9);
        this.core.go(offset);
    };

    replace = (replace = true): void => this.core.replace(replace);

    buffer = (): void => this.core.buffer();

    done = (): void => this.core.done();

    //
    // hooks
    //

    useDerive(callback: DeriveCallback<V>): void {
        useEffect(() => this.onDerive(callback), []);
    }

    useCancel(callback: CancelCallback): void {
        useEffect(() => this.onCancel(callback), []);
    }

    useChange(callback: ChangeCallback<V>): void {
        useEffect(() => this.onChange(callback), []);
    }

    useChangeIndex(callback: ChangeCallback<number>): void {
        useEffect(() => this.onChangeIndex(callback), []);
    }

    useChangeHistory(callback: ChangeCallback<HistoryState>): void {
        useEffect(() => this.onChangeHistory(callback), []);
    }

    useValue(): V {
        const [value, setValue] = useState<V>(() => this.value);
        this.useChange(setValue);
        return value;
    }

    useIndex(): number {
        const [index, setIndex] = useState<number>(() => this.index);
        this.useChangeIndex(setIndex);
        return index;
    }

    useHistory(): HistoryState {
        const [historyState, setHistoryState] = useState<HistoryState>(this.core.state.historyState);
        this.useChangeHistory(setHistoryState);
        return historyState;
    }

    //
    // branching
    //

    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4],P>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3]): Dendriform<Val<Val<Val<V,K1>,K2>,K3>,P>;
    branch<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2]): Dendriform<Val<Val<V,K1>,K2>,P>;
    branch<K1 extends Key<V>>(path: [K1]): Dendriform<Val<V,K1>,P>;
    branch(path?: []): Dendriform<V,P>;
    branch<K1 extends Key<V>>(key: K1): Dendriform<Val<V,K1>,P>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branch(pathOrKey: any): any {
        const appendPath = ([] as Path).concat(pathOrKey ?? []);
        const basePath = this.core.getPath(this.id);
        return this.core.getFormAt(basePath?.concat(appendPath), this._readonly);
    }

    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4]>(path: [K1, K2, K3, K4]): Dendriform<BranchableChild<W>,P>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3]): Dendriform<BranchableChild<W>,P>[];
    branchAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2>>(path: [K1, K2]): Dendriform<BranchableChild<W>,P>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1>>(path: [K1]): Dendriform<BranchableChild<W>,P>[];
    branchAll<K1 extends Key<V>, W extends Val<V,K1>>(key: K1): Dendriform<BranchableChild<W>,P>[];
    branchAll<W extends V>(path?: []): Dendriform<BranchableChild<W>,P>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    branchAll(pathOrKey: any): any {
        const got = this.branch(pathOrKey);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return entriesOrDie(got.value, 2).map(([key]) => got.branch(key as any));
    }

    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>[K4],P>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>>(path: [K1, K2, K3], renderer: Renderer<Dendriform<Val<Val<Val<V,K1>,K2>,K3>,P>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>, K2 extends keyof Val<V,K1>>(path: [K1, K2], renderer: Renderer<Dendriform<Val<Val<V,K1>,K2>,P>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(path: [K1], renderer: Renderer<Dendriform<Val<V,K1>,P>>, deps?: unknown[]): React.ReactElement;
    render(path: [], renderer: Renderer<Dendriform<V,P>>, deps?: unknown[]): React.ReactElement;
    render<K1 extends Key<V>>(key: K1, renderer: Renderer<Dendriform<Val<V,K1>,P>>, deps?: unknown[]): React.ReactElement;
    render(renderer: Renderer<Dendriform<V,P>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,  @typescript-eslint/explicit-module-boundary-types
    render(a: any, b: any, c: any): React.ReactElement {
        const aIsRenderer = typeof a === 'function';
        const renderer = aIsRenderer ? a : b;
        const deps = aIsRenderer ? b : c;
        const form = aIsRenderer ? this : this.branch(a);
        return <Branch key={form.id} renderer={() => renderer(form)} deps={deps} />;
    }

    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, K4 extends keyof Val<Val<Val<V,K1>,K2>,K3>, W extends Val<Val<Val<V,K1>,K2>,K3>[K4]>(path: [K1, K2, K3, K4], renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, K3 extends keyof Val<Val<V,K1>,K2>, W extends Val<Val<Val<V,K1>,K2>,K3>>(path: [K1, K2, K3], renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, K2 extends keyof Val<V,K1>, W extends Val<Val<V,K1>,K2>>(path: [K1, K2], renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1>>(path: [K1], renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V>(path: [], renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<K1 extends Key<V>, W extends Val<V,K1>>(key: K1, renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[]): React.ReactElement;
    renderAll<W extends V>(renderer: Renderer<Dendriform<BranchableChild<W>,P>>, deps?: unknown[], notNeeded?: unknown): React.ReactElement;
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

        return <Branch key={form.id} renderer={containerRenderer} deps={deps} />;
    }

    readonly(): Dendriform<V,P> {
        return this.core.getFormById(this.id, true) as Dendriform<V,P>;
    }
}

//
// useDendriform
//

type UseDendriformValue<V> = (() => V)|V;

export const useDendriform = <V,P extends Plugins = undefined>(initialValue: UseDendriformValue<V>, {plugins, dependencies = [], ...options}: UseDendriformOptions<P> = {}): Dendriform<V,P> => {
    const [form] = useState(() => {
        const value = typeof initialValue === 'function'
            ? (initialValue as (() => V))()
            : initialValue;

        return new Dendriform<V,P>(value as V, {
            plugins: plugins?.(),
            ...options
        });
    });

    const lastDependencies = useRef<unknown[]>(dependencies);
    if(!shallowEqualArrays(lastDependencies.current, dependencies) && typeof initialValue === 'function') {
        form.replace();
        form.set((initialValue as (() => V))());
    }
    lastDependencies.current = dependencies;

    return form;
};
