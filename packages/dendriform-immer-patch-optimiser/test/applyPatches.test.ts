import {applyPatches} from '../src/index';
import type {DendriformPatch} from '../src/types';

describe(`applyPatches`, () => {
    test(`should apply add, remove, replace, move and moveTo patches`, () => {

        const base = ['a','b','c','d','e'];

        const patches: DendriformPatch[] = [
            {op: 'add', path: [4], value: 'D'}, // abcdDe
            {op: 'remove', path: [1]}, // acdDe
            {op: 'replace', path: [0], value: 'A'}, // AcdDe
            {op: 'move', from: [1], path: [4]} // AdDec
        ];

        const result = applyPatches(base, patches);

        expect(result).toEqual(['A','d','D','e','c']);
    });
});
