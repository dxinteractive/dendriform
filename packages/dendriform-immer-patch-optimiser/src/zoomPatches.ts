import type {DendriformPatch, Path} from './types';
import type {Patch as ImmerPatch} from 'immer';

export const zoomInPatches = <P extends ImmerPatch | DendriformPatch>(path: Path, patches: P[]): P[] => {
    return patches
        .filter(patch => path.every((elem, index) => elem === patch.path[index]))
        .map(patch => {
            return {
                ...patch,
                path: patch.path.slice(path.length)
            };
        });
};

export const zoomOutPatches = <P extends ImmerPatch | DendriformPatch>(path: Path, patches: P[]): P[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return patches.map((patch: any): any => {
        const newPatch = {
            ...patch,
            path: path.concat(patch.path)
        };
        if(patch.from) {
            newPatch.from = path.concat(patch.from);
        }
        return newPatch;
    });
};
