import {produceWithPatches, nothing} from 'immer';
import {optimise} from 'dendriform-immer-patch-optimiser';

import type {Draft} from 'immer';
import type {DendriformPatch} from 'dendriform-immer-patch-optimiser';

export type PatchCreator<V> = (base: V) => DendriformPatch[];

export type ImmerProducer<V> = (draft: Draft<V>) => V | undefined | void;
export type ToProduce<V> = V | ImmerProducer<V>;

function isImmerProducer<V>(toProduce: ToProduce<V>): toProduce is ImmerProducer<V> {
    return typeof (toProduce as ImmerProducer<V>) === 'function';
}

export const producePatches = <V>(base: V, toProduce: ToProduce<V>): [V, DendriformPatch[], DendriformPatch[]] => {

    const [newValue, patches, inversePatches] = produceWithPatches(base, draft => {
        if(isImmerProducer(toProduce)) {
            return toProduce(draft);
        }
        return toProduce === undefined ? nothing : toProduce;
    });

    return [
        newValue as V,
        patches
            ? optimise(base, patches)
            : [{op: 'replace', path: [], value: newValue}],
        inversePatches
            ? optimise(newValue, inversePatches)
            : [{op: 'replace', path: [], value: base}]
    ];
};
