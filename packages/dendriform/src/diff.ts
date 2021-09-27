import type {StateDiff, BranchableChild} from './index';
import type {Key, DataType} from 'dendriform-immer-patch-optimiser';
import type {Nodes} from './Nodes';

import {BASIC, ARRAY, get, getType, entries} from 'dendriform-immer-patch-optimiser';

const getArrayNodeChild = (type: DataType, nodes?: Nodes, id?: string): Key[]|undefined => {
    if(type !== ARRAY) {
        return undefined;
    }
    return (nodes && id)
        ? nodes[id].child as Key[]
        : [];
};

const getIds = <V,>(type: DataType, value?: V, arrayNodeChild?: Key[]): Key[] => {
    if(arrayNodeChild) {
        return arrayNodeChild;
    }
    if(type === BASIC) {
        return [];
    }
    return entries(value).map(([key]) => key);
};

const idsToKeys = (ids: Key[], arrayNodeChild?: Key[]): Key[] => {
    if(!arrayNodeChild) {
        return ids;
    }
    return ids.map(id => arrayNodeChild.indexOf(id));
};

const keysToDiffs = <V,>(keys: Key[], value: V): Diff<BranchableChild<V>>[] => {
    return keys.map(key => ({
        key,
        value: get(value, key) as BranchableChild<V>
    }));
};

export type DiffDetails<V> = {
    prev: StateDiff<V|undefined,Nodes|undefined>;
    next: StateDiff<V,Nodes>;
    id: string;
};

export type Diff<V> = {
    key: Key;
    value: V;
};

export type DiffOptions = {
    calculateUpdated?: boolean;
};

export const diff = <V,>(details: DiffDetails<V>, options: DiffOptions = {}): [Diff<BranchableChild<V>>[], Diff<BranchableChild<V>>[], Diff<BranchableChild<V>>[]] => {

    const {calculateUpdated = true} = options;

    const prevValue = details.prev.value;
    const nextValue = details.next.value;

    const prevNodes = details.prev.nodes;
    const nextNodes = details.next.nodes;

    const prevType = getType(prevValue);
    const nextType = getType(nextValue);

    const prevArrayNodeChild = getArrayNodeChild(prevType, prevNodes, details.id);
    const nextArrayNodeChild = getArrayNodeChild(nextType, nextNodes, details.id);

    const prevIds = getIds<V>(prevType, prevValue, prevArrayNodeChild);
    const nextIds = getIds<V>(nextType, nextValue, nextArrayNodeChild);

    const prevIdsSet = new Set(prevIds);
    const nextIdsSet = new Set(nextIds);

    const addedIds = nextIds.filter(key => !prevIdsSet.has(key));
    const removedIds = prevIds.filter(key => !nextIdsSet.has(key));

    const addedKeys = idsToKeys(addedIds, nextArrayNodeChild);
    const removedKeys = idsToKeys(removedIds, prevArrayNodeChild);

    const addedDiffs = keysToDiffs<V>(addedKeys, nextValue);
    const removedDiffs = keysToDiffs<V>(removedKeys, prevValue as V);

    if(!calculateUpdated) {
        return [
            addedDiffs,
            removedDiffs,
            []
        ];
    }

    const continuedIds = nextIds.filter(key => prevIdsSet.has(key));

    const continuedPrevKeys = idsToKeys(continuedIds, prevArrayNodeChild);
    const continuedNextKeys = idsToKeys(continuedIds, nextArrayNodeChild);

    const continuedPrevDiffs = keysToDiffs<V>(continuedPrevKeys, prevValue as V);
    const continuedNextDiffs = keysToDiffs<V>(continuedNextKeys, nextValue);

    const updatedDiffs = continuedNextDiffs
        .map((diff, index): Diff<BranchableChild<V>>|undefined => {
            return Object.is(continuedPrevDiffs[index].value, diff.value) ? undefined : diff;
        })
        .filter((diff): diff is Diff<BranchableChild<V>> => !!diff);

    return [
        addedDiffs,
        removedDiffs,
        updatedDiffs
    ];
};

