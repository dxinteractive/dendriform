import {produceWithPatches} from 'immer';
import {optimise} from 'dendriform-immer-patch-optimiser';

import type {Draft, Patch as ImmerPatch} from 'immer';
import type {DendriformPatch} from 'dendriform-immer-patch-optimiser';

//
// patches
//

export class Patch {
    value: DendriformPatch[] = [];
    nodes: DendriformPatch[] = [];

    static concat(itemA: Patch|undefined, itemB: Patch|undefined): Patch {
        const next = new Patch();
        next.value = (itemA?.value ?? []).concat(itemB?.value ?? []);
        next.nodes = (itemA?.nodes ?? []).concat(itemB?.nodes ?? []);
        return next;
    }
}

export type PatchCreator<V> = (base: V) => DendriformPatch[];

export type PatchPair<V> = {
    __patches: PatchCreator<V>;
    __patchesInverse: PatchCreator<V>;
};

export type ImmerProducer<V> = (draft: Draft<V>) => V | undefined | void;
export type ToProduce<V> = V | PatchPair<V> | ImmerProducer<V>;

function isPatchPair<V>(toProduce: ToProduce<V>): toProduce is PatchPair<V> {
    const patchPair = toProduce as PatchPair<V>;
    return patchPair && !!patchPair.__patches && !!patchPair.__patchesInverse;
}

function isImmerProducer<V>(toProduce: ToProduce<V>): toProduce is ImmerProducer<V> {
    return typeof (toProduce as ImmerProducer<V>) === 'function';
}

function isPatchCreator<V>(patches: DendriformPatch[]|PatchCreator<V>): patches is PatchCreator<V> {
    return typeof (patches as PatchCreator<V>) === 'function';
}

export const patches = <V,>(patches: DendriformPatch[]|PatchCreator<V>, patchesInverse?: DendriformPatch[]|PatchCreator<V>): PatchPair<V> => {
    return {
        __patches: isPatchCreator(patches) ? patches : () => patches,
        __patchesInverse: patchesInverse
            ? (isPatchCreator(patchesInverse) ? patchesInverse : () => patchesInverse)
            : () => []
    };
};

export const noChange = patches([], []);

//
// produce and optimise
//

const optimisePatches = <V,>(base: V, newValue: V, track: boolean, patches?: ImmerPatch[], patchesInverse?: ImmerPatch[]): [DendriformPatch[], DendriformPatch[]] => {
    if(!patches) {
        patches = [{op: 'replace', path: [], value: newValue}];
    }
    if(!patchesInverse) {
        patchesInverse = [{op: 'replace', path: [], value: base}];
    }
    if(!track) {
        return [
            patches,
            patchesInverse
        ];
    }
    return [
        optimise(base, patches),
        optimise(newValue, patchesInverse)
    ];
};

export const producePatches = <V>(base: V, toProduce: ToProduce<V>, track = true): [DendriformPatch[], DendriformPatch[]] => {

    if(isPatchPair(toProduce)) {
        return [
            toProduce.__patches(base),
            toProduce.__patchesInverse(base)
        ];
    }

    if(isImmerProducer(toProduce)) {
        const [newValue, patches, patchesInverse] = produceWithPatches<V>(base, toProduce);
        return optimisePatches<V>(base, newValue as V, track, patches, patchesInverse);
    }

    return optimisePatches<V>(base, toProduce, track);
};
