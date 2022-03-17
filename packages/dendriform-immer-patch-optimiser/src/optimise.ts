import {applyPatches, enablePatches, nothing} from 'immer';
import {getIn} from './traverse';
import {zoomInPatches, zoomOutPatches} from './zoomPatches';
import type {Patch as ImmerPatch} from 'immer';
import type {DendriformPatch, Path, Key} from './types';

enablePatches();

type CheckPathResult = [boolean, string];

//
// optimise()
//
// chunks patches into groups where paths are the same
// and optimises patches that relates to transformations on an array
//
// e.g.
// value at ['foo','bar'] is an array
//
// [
//   {path: ['foo'], ...}
//   {path: ['foo'], ...}
//   {path: ['foo','bar', 0], ...} // optimise this
//   {path: ['foo','bar', 1], ...} // optimise this
//   {path: ['foo','bar', 2], ...} // optimise this
//   {path: ['foo','qux'], ...}
// ]
//

export const optimise = <B,>(base: B, patches: ImmerPatch[]): DendriformPatch[] => {

    let newPatches: DendriformPatch[] = [];

    // check path is array (memoised)
    let lastResult: CheckPathResult|undefined;
    const checkPathIsArray = <B,>(base: B, path: Key[]): boolean => {
        const pathString = JSON.stringify(path);
        if(lastResult && lastResult[1] === pathString) return lastResult[0];
        const isArray = Array.isArray(getIn(base, path));
        lastResult = [isArray, pathString];
        return isArray;
    };

    // buffer
    let currentPath: Path|undefined;
    let buffer: ImmerPatch[] = [];

    const flush = (): void => {
        if(buffer.length === 0) return;
        if(currentPath) {
            const baseAtPath = getIn(base, currentPath);
            const patchesAtPath = zoomInPatches<ImmerPatch>(currentPath, buffer);
            // optimise patches
            const optimisedPatches = optimiseArray(baseAtPath as unknown[], patchesAtPath);
            const zoomedOutPatches = zoomOutPatches<DendriformPatch>(currentPath, optimisedPatches);
            newPatches = newPatches.concat(zoomedOutPatches);
        } else {
            newPatches = newPatches.concat(buffer);
        }
        buffer = [];
    };

    // seek
    patches.forEach(patch => {
        const {path} = patch;
        const parentPath = path.slice(0,-1);
        const thisPath = checkPathIsArray(base, parentPath) ? parentPath : undefined;

        // reset buffer whenever path changes
        if(JSON.stringify(thisPath) !== JSON.stringify(currentPath)) {
            flush();
            currentPath = thisPath;
        }

        if(patch.value === nothing) {
            patch = {...patch, value: undefined};
        }
        // ^ bug fix until https://github.com/immerjs/immer/issues/791

        buffer.push(patch);
    });

    flush();

    // output

    return newPatches;
};


//
// optimiseArray()
//
// accepts patches with a common path relating to an array
// applies them, and optimises the patches required to produce
// the same result by using 'move' patches
//

export const optimiseArray = <B>(base: B[], patches: ImmerPatch[]): DendriformPatch[] => {

    const newPatches: DendriformPatch[] = [];

    // give unique id numbers to all values in base and patches for processing
    let id = 0;
    const valueToId = new Map<B, number>();
    const idToValue = new Map<number, B>();

    const addItem = (value: B): number => {
        if(valueToId.has(value)) {
            return valueToId.get(value) as number;
        }
        const newId = id++;
        valueToId.set(value, newId);
        idToValue.set(newId, value);
        return newId;
    };

    // add items from base
    const baseIds = base.map(addItem);
    const baseIdSet = new Set(baseIds);

    // add items from patches
    let targetIds: number[] = [];
    if(patches.length === 1 && patches[0].path.length === 0) {
        // this is a top level replace, substitute element ids directly
        const {value} = patches[0];
        if(!Array.isArray(value)) return patches;
        targetIds = value.map(addItem);

    } else if(base.some(b => typeof b !== 'object')) {
        // if any primitives are in the array, we cant reliably track by reference
        // so skip the optimisation
        return patches;

    } else {
        const replacedPatches = patches.map(patch => {
            const {op, value, path} = patch;

            if(op === 'remove' // if 'remove', no value exists
                || (op === 'replace' && path.length === 1 && path[0] === 'length') // this is an array length change
            ) {
                return patch;
            }

            return {
                ...patch,
                value: addItem(value)
            };
        });

        targetIds = applyPatches(baseIds, replacedPatches) as number[];
    }

    // ignoring newly added values
    // look at each id in the target array
    // and add a 'move' operation that will move each id into the correct position

    const existingTargetIds = targetIds.filter(id => baseIdSet.has(id));
    const wipIds = baseIds.slice(); // this array can be mutated as the sort progresses

    existingTargetIds.forEach((targetId, index) => {
        if(targetId !== wipIds[index]) {
            const fromIndex = wipIds.indexOf(targetId);
            newPatches.push({op: 'move', from: [fromIndex], path: [index]});
            wipIds.splice(fromIndex, 1);
            wipIds.splice(index, 0, targetId);
        }
    });

    // after this sorting is done
    // all the items to be removed will be collected at the end of the array
    // and can be truncated off

    if(existingTargetIds.length < baseIds.length) {
        newPatches.push({op: 'replace', path: ['length'], value: existingTargetIds.length});
    }

    // finally, add new items into result

    targetIds.forEach((id, index) => {
        if(!baseIdSet.has(id)) {
            const value = idToValue.get(id);
            newPatches.push({op: 'add', path: [index], value});
        }
    });

    return newPatches;
};
