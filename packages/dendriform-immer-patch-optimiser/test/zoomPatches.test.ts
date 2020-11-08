import {zoomInPatches, zoomOutPatches} from '../src/index';
import type {DendriformPatch} from '../src/types';

describe(`zoomInPatches`, () => {
    test(`should zoom in`, () => {

        const patches: DendriformPatch[] = [
            {op: 'add', path: [1, 'two', 3], value: 3},
            {op: 'add', path: [1, 'three', 4], value: 4},
            {op: 'add', path: [1, 'two', 5], value: 5}
        ];

        expect(zoomInPatches([1, 'two'], patches)).toEqual([
            {op: 'add', path: [3], value: 3},
            {op: 'add', path: [5], value: 5}
        ]);
    });
});

describe(`zoomOutPatches`, () => {
    test(`should zoom in`, () => {

        const patches: DendriformPatch[] = [
            {op: 'add', path: [3], value: 3},
            {op: 'add', path: [5], value: 5}
        ];

        expect(zoomOutPatches([1, 'two'], patches)).toEqual([
            {op: 'add', path: [1, 'two', 3], value: 3},
            {op: 'add', path: [1, 'two', 5], value: 5}
        ]);
    });
});

