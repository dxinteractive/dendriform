
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
import {newNode, addNode, getPath, getNodeByPath, produceNodePatches} from './Nodes';
import type {Nodes, NodeAny, CountRef} from './Nodes';

//
// core
//

type ProduceValue<V> = (toProduce: ToProduce<V>) => void;
type ChangeCallback<V> = (newValue: V) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChangeCallbackRef = [number, ChangeCallback<any>, any];
type ChangeBufferItem = [number, DendriformPatch[], DendriformPatch[]];

type CoreOptions<C> = {
    initialValue: C;
};

class Core<C> {

    value: C;
    nodes: Nodes = {};
    nodeCountRef: CountRef = {current: 0};
    changeCallbackRefs = new Set<ChangeCallbackRef>();
    dendriforms = new Map<number,Dendriform<unknown,C>>();

    constructor(options: CoreOptions<C>) {
        this.value = options.initialValue;
        this.changeBuffer.time = 10;
        addNode(this.nodes, newNode(this.nodeCountRef, this.value, -1));
    }

    getPath = (id: number): Path|undefined => {
        return getPath(this.nodes, id);
    };

    getValue = (id: number): unknown => {
        const path = this.getPath(id);
        if(!path) return undefined;
        return getIn(this.value, path);
    };

    createForm = (node: NodeAny): unknown => {
        const {id} = node;
        const __branch = {core: this, id};
        const form = new Dendriform<any>({__branch});
        this.dendriforms.set(id, form);
        return form;
    };

    getFormAt = (baseId: number, appendPath: Path): unknown => {
        const basePath = this.getPath(baseId);
        if(!basePath) {
            throw new Error('NOPE!');
        }
        const path = basePath.concat(appendPath);
        const node = getNodeByPath(this.nodes, this.nodeCountRef, this.value, path);
        if(!node) {
            throw new Error('NOPE!!!');
        }
        return this.dendriforms.get(node.id) || this.createForm(node);
    };

    set = (id: number, toProduce: unknown): void => {
        const path = this.getPath(id);
        if(!path) return;

        const value = this.getValue(id);

        const [, valuePatches, valuePatchesInv] = producePatches(value, toProduce);
        const valuePatchesZoomed = zoomOutPatches(path, valuePatches);
        const valuePatchesInvZoomed = zoomOutPatches(path, valuePatchesInv);

        const [, nodesPatches, nodesPatchesInv] = produceNodePatches(
            this.nodes,
            this.nodeCountRef,
            this.value,
            valuePatchesZoomed
        );

        const patches = valuePatchesZoomed.concat(nodesPatches);
        const patchesInv = valuePatchesInvZoomed.concat(nodesPatchesInv);

        this.changeBuffer.push([id, patches, patchesInv]);
    };

    applyChanges = (changes: ChangeBufferItem[]): void => {
        const valuePatchesToApply: DendriformPatch[] = [];
        const nodesPatchesToApply: DendriformPatch[] = [];

        changes.forEach(([, patches]) => {
            patches.forEach(patch => {
                if(patch.namespace === 'nodes') {
                    nodesPatchesToApply.push(patch);
                } else {
                    valuePatchesToApply.push(patch);
                }
            });
        });

        this.value = applyPatches(this.value, valuePatchesToApply);
        this.nodes = applyPatches(this.nodes, nodesPatchesToApply);
        this.updateChangeCallbacks();
    };

    changeBuffer = new BufferTime<ChangeBufferItem>(this.applyChanges);

    updateChangeCallbacks = (): void => {
        this.changeCallbackRefs.forEach((changeCallbackRef) => {
            const [id, callback, prevValue] = changeCallbackRef;
            try {
                const nextValue = this.getValue(id);
                if(!Object.is(nextValue, prevValue)) {
                    callback(nextValue);
                    changeCallbackRef[2] = nextValue;
                }
            } catch(e) {
                // TODO there may be value setters that still exist
                // but whose data has disappeared
                // and they haven't yet rerendered
            }
        });
    };
}

//
// branch
//

interface BranchProps {
    renderer: () => React.ReactElement|React.ReactElement[],
    deps: unknown[]
}

// eslint-disable-next-line react/display-name
const Branch = React.memo(
    // eslint-disable-next-line react/prop-types
    (props: BranchProps): React.ReactElement => <>{props.renderer()}</>,
    (prevProps, nextProps) => shallowEqualArrays(prevProps.deps, nextProps.deps)
);

//
// wrapper
//

type DendriformBranch<C> = {
    __branch: {
        core: Core<C>;
        id: number;
    };
};

type Renderer<D> = (form: D) => React.ReactElement;

export class Dendriform<V,C=V> {

    // dev notes:
    // the dendriform class is merely a fancy way to get and set data
    // Dendriform instances should never be stateful
    // only Core should be stateful
    // hooks provided by Dendriform can be stateful

    core: Core<C>;

    id: number;

    constructor(initialValue: V|DendriformBranch<C>) {

        if((typeof initialValue === 'object' && (initialValue as DendriformBranch<C>).__branch)) {
            const {__branch} = initialValue as DendriformBranch<C>;
            this.core = __branch.core;
            this.id = __branch.id;
            return;
        }

        this.id = 0;
        this.core = new Core<C>({
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            initialValue: initialValue as C
        });
    }

    get value(): V {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.core.getValue(this.id);
    }

    set = (toProduce: ToProduce<V>): void => {
        this.core.set(this.id, toProduce);
    };

    useValue = (): [V, ProduceValue<V>] => {
        const [value, setValue] = useState<V>(() => this.value);

        useEffect(() => this.onChange(setValue), []);

        // TODO - add optimistic hook updates back in after undo / redo
        // const set = useCallback((toProduce: ToProduce<V>): void => {
        //     setValue((base: V): V => {
        //         const [,patches] = setPatches(base, toProduce);
        //         //this.core.changeBuffer.push([this.id, patches]);
        //         return applyPatches(base, patches);
        //     });
        // }, []);

        return [value, this.set];
    };

    onChange = (callback: ChangeCallback<V>): (() => void) => {
        const changeCallback: ChangeCallbackRef = [this.id, callback, this.value];
        this.core.changeCallbackRefs.add(changeCallback);
        return () => void this.core.changeCallbackRefs.delete(changeCallback);
    };

    branch<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2], K4 extends keyof V[K1][K2][K3]>(path: [K1, K2, K3, K4]): Dendriform<V[K1][K2][K3][K4],C>;
    branch<K1 extends keyof V, K2 extends keyof V[K1], K3 extends keyof V[K1][K2]>(path: [K1, K2, K3]): Dendriform<V[K1][K2][K3],C>;
    branch<K1 extends keyof V, K2 extends keyof V[K1]>(path: [K1, K2]): Dendriform<V[K1][K2],C>;
    branch<K1 extends keyof V>(path: [K1]): Dendriform<V[K1],C>;
    branch(path?: []): Dendriform<V,C>;
    branch<K1 extends keyof V>(key: K1): Dendriform<V[K1],C>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    branch(pathOrKey: any): any {
        const path = ([] as Path).concat(pathOrKey ?? []);
        return this.core.getFormAt(this.id, path);
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

        if(!Array.isArray(array)) {
            throw new Error('branchAll() can only be called on forms containing arrays');
        }
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

            if(!Array.isArray(array)) {
                throw new Error('renderAll() can only be called on forms containing arrays');
            }

            return array.map((_element, index): React.ReactElement => {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const child = form.branch(index);
                return <div key={child.id}>
                    {child.id}: <Branch renderer={() => renderer(child)} deps={deps} />
                </div>;
            });
        };

        return <Branch renderer={containerRenderer} deps={deps} />;
    }
}

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
