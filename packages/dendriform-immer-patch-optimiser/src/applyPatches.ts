import {applyPatches as immerApplyPatches} from 'immer';
import {getIn} from './traverse';
import type {Patch as ImmerPatch} from 'immer';
import type {DendriformPatch, Path} from './types';

export const applyPatches = <B,>(base: B, patches: DendriformPatch[]): B => {
    patches.forEach(patch => {
        if(patch.op === 'move') {
            const patchFrom = patch.from as Path;
            base = immerApplyPatches(base, [
                {op: 'remove', path: patchFrom},
                {op: 'add', path: patch.path, value: getIn(base, patchFrom)}
            ]);
        } else {
            base = immerApplyPatches(base, [patch as ImmerPatch]);
        }
    });
    return base;
};
