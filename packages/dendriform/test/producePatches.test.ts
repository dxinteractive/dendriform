import {producePatches, patches} from '../src/index';
import {applyPatches} from 'dendriform-immer-patch-optimiser';

describe(`producePatches`, () => {

    describe(`accepting a value`, () => {
        test(`should accept a value and output patches`, () => {
            expect(producePatches(1, 2)[0]).toEqual([{op: 'replace', path: [], value: 2}]);
            expect(producePatches(1, 2)[1]).toEqual([{op: 'replace', path: [], value: 1}]);

            expect(producePatches('strong', 'string')[0]).toEqual([{op: 'replace', path: [], value: 'string'}]);
            expect(producePatches(1, undefined)[0]).toEqual([{op: 'replace', path: [], value: undefined}]);
            expect(producePatches(1, null)[0]).toEqual([{op: 'replace', path: [], value: null}]);
            expect(producePatches({}, {foo: true})[0]).toEqual([{op: 'replace', path: [], value: {foo: true}}]);
            expect(producePatches([1], [])[0]).toEqual([{op: 'replace', path: ['length'], value: 0}]);
            expect(producePatches([1], [2])[0]).toEqual([
                {op: 'replace', path: ['length'], value: 0},
                {op: 'add', path: [0], value: 2}
            ]);
            expect(producePatches([{op: 1}], [{op: 2}])[0]).toEqual([
                {op: 'replace', path: ['length'], value: 0},
                {op: 'add', path: [0], value: {op: 2}}
            ]);
        });
    });

    describe(`accepting an immer producer`, () => {
        test(`should accept an immer producer`, () => {
            const base = ['a'];
            const [patches, inversePatches] = producePatches(base, draft => {
                draft.push('b');
            });

            expect(applyPatches(base, patches)).toEqual(['a','b']);
            expect(patches).toEqual([
                {op: 'add', path: [1], value: 'b'}
            ]);
            expect(inversePatches).toEqual([
                {op: 'replace', path: ['length'], value: 1}
            ]);
        });

        test(`should internally use dendriform-immer-patch-optimiser`, () => {

            const base = [
                {name: 'a'},
                {name: 'b'}
            ];

            const [patches, inversePatches] = producePatches(base, draft => {
                draft.unshift({name: 'c'});
                draft.reverse();
            });

            expect(applyPatches(base, patches)).toEqual([
                {name: 'b'},
                {name: 'a'},
                {name: 'c'}
            ]);

            expect(patches).toEqual([
                {op: 'move', path: [0], from: [1]},
                {op: 'add', path: [2], value: {name: 'c'}}
            ]);
            expect(inversePatches).toEqual([
                {op: 'move', path: [0], from: [1]},
                {op: 'replace', path: ['length'], value: 2}
            ]);
        });
    });

    describe(`accepting a patch pair`, () => {
        // primary for internal usages such as array.ts

        test(`should accept a patch pair and output them`, () => {

            const base = ['a','b','c'];

            const [patches, inversePatches] = producePatches(base, {
                __patches: (base) => [
                    {op: 'remove', path: [base.length - 1]}
                ],
                __patchesInverse: (base) => [
                    {op: 'add', path: [base.length - 1], value: base[base.length - 1]}
                ]
            });

            expect(applyPatches(base, patches)).toEqual(['a','b']);

            expect(patches).toEqual([
                {op: 'remove', path: [2]}
            ]);

            expect(inversePatches).toEqual([
                {op: 'add', path: [2], value: 'c'}
            ]);
        });
    });

});


describe(`patches`, () => {

    const base = {foo: 0};

    test(`should create patches from patch arrays`, () => {

        const p1 = [{op: 'add', path: ['foo'], value: 123}];
        const p2 = [{op: 'remove', path: ['foo']}];

        const patchPair = patches(p1, p2);

        expect(patchPair.__patches(base)).toEqual(p1);
        expect(patchPair.__patchesInverse(base)).toEqual(p2);
    });

    test(`should create patches from patch creators`, () => {

        const p1 = () => [{op: 'add', path: ['foo'], value: 123}];
        const p2 = () => [{op: 'remove', path: ['foo']}];

        const patchPair = patches(p1, p2);

        expect(patchPair.__patches(base)).toEqual(p1());
        expect(patchPair.__patchesInverse(base)).toEqual(p2());
    });

    test(`should create empty array for inverse patches if not provided`, () => {

        const p1 = [{op: 'add', path: ['foo'], value: 123}];

        const patchPair = patches(p1);

        expect(patchPair.__patches(base)).toEqual(p1);
        expect(patchPair.__patchesInverse(base)).toEqual([]);
    });

});
