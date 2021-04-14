import {array} from '../src/index';
import {producePatches} from '../src/index';
import {Dendriform} from '../src/index';
import {applyPatches} from 'dendriform-immer-patch-optimiser';

describe(`array`, () => {

    describe(`unshift`, () => {

        test(`with producePatches`, () => {
            const value = ['a','b','c'];
            const expectedNewValue = ['d','a','b','c'];

            const [newValue, patches, inversePatches] = producePatches(value, array.unshift('d'));

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'add', path: [0], value: 'd'}
            ]);
            expect(inversePatches).toEqual([
                {op: 'remove', path: [0]}
            ]);
        });

        test(`with Dendriform`, () => {
            const form = new Dendriform(['a','b','c']);

            expect(form.branch(0).id).toBe('1');
            expect(form.branch(1).id).toBe('2');
            expect(form.branch(2).id).toBe('3');

            form.set(array.unshift('d'));

            expect(form.value).toEqual(['d','a','b','c']);
            expect(form.branch(0).id).toBe('4');
            expect(form.branch(1).id).toBe('1');
            expect(form.branch(2).id).toBe('2');
            expect(form.branch(3).id).toBe('3');
        });

        test(`unshift deep with Dendriform`, () => {
            const form = new Dendriform({
                foo: [
                    {name: 'a'},
                    {name: 'b'},
                    {name: 'c'}
                ]
            });

            form.branch('foo').set(array.unshift({name: 'd'}));

            expect(form.value).toEqual({
                foo: [
                    {name: 'd'},
                    {name: 'a'},
                    {name: 'b'},
                    {name: 'c'}
                ]
            });

            expect(form.branch(['foo',0]).id).toBe('5');
            expect(form.branch(['foo',1]).id).toBe('2');
            expect(form.branch(['foo',2]).id).toBe('3');
            expect(form.branch(['foo',3]).id).toBe('4');
        });
    });

    describe(`push`, () => {

        test(`with producePatches`, () => {
            const value = ['a','b','c'];
            const expectedNewValue = ['a','b','c','d'];

            const [newValue, patches, inversePatches] = producePatches(value, array.push('d'));

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'add', path: [3], value: 'd'}
            ]);
            expect(inversePatches).toEqual([
                {op: 'remove', path: [3]}
            ]);
        });

        test(`with Dendriform`, () => {
            const form = new Dendriform(['a','b','c']);

            form.set(array.push('d'));

            expect(form.value).toEqual(['a','b','c','d']);
            expect(form.branch(0).id).toBe('1');
            expect(form.branch(1).id).toBe('2');
            expect(form.branch(2).id).toBe('3');
            expect(form.branch(3).id).toBe('4');
        });

    });

    describe(`pop`, () => {

        test(`with producePatches`, () => {
            const value = ['a','b','c'];
            const expectedNewValue = ['a','b'];

            const [newValue, patches, inversePatches] = producePatches(value, array.pop());

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'remove', path: [2]}
            ]);
            expect(inversePatches).toEqual([
                {op: 'add', path: [2], value: 'c'}
            ]);
        });

        test(`with Dendriform`, () => {
            const form = new Dendriform(['a','b','c']);

            form.set(array.pop());

            expect(form.value).toEqual(['a','b']);
            expect(form.branch(0).id).toBe('1');
            expect(form.branch(1).id).toBe('2');
        });
    });

    describe(`shift`, () => {

        test(`with producePatches`, () => {
            const value = ['a','b','c'];
            const expectedNewValue = ['b','c'];

            const [newValue, patches, inversePatches] = producePatches(value, array.shift());

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'remove', path: [0]}
            ]);
            expect(inversePatches).toEqual([
                {op: 'add', path: [0], value: 'a'}
            ]);
        });

        test(`with Dendriform`, () => {
            const form = new Dendriform(['a','b','c']);

            form.set(array.shift());

            expect(form.value).toEqual(['b','c']);
            expect(form.branch(0).id).toBe('2');
            expect(form.branch(1).id).toBe('3');
        });
    });

    describe(`remove`, () => {

        test(`with producePatches`, () => {
            const [, patches, inversePatches] = producePatches('a', array.remove());
            // ignore newValue in this test
            // Dendriform doesnt use it anyway
            expect(patches).toEqual([
                {op: 'remove', path: []}
            ]);
            expect(inversePatches).toEqual([
                {op: 'add', path: [], value: 'a'}
            ]);
        });

        test(`with Dendriform`, () => {
            const form = new Dendriform(['a','b','c']);

            form.branch(0).set(array.remove());

            expect(form.value).toEqual(['b','c']);
            expect(form.branch(0).id).toBe('2');
            expect(form.branch(1).id).toBe('3');
        });
    });

    describe(`move`, () => {

        test(`with producePatches`, () => {
            const value = ['a','b','c','d'];
            const expectedNewValue = ['a','d','b','c'];

            const [newValue, patches, inversePatches] = producePatches(value, array.move(3,1));

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'move', from: [3], path: [1]}
            ]);
            expect(inversePatches).toEqual([
                {op: 'move', from: [1], path: [3]}
            ]);
        });

        test(`move with producePatches should wrap past end`, () => {
            const value = ['a','b','c','d'];
            const expectedNewValue = ['d','a','b','c'];

            const [newValue, patches, inversePatches] = producePatches(value, array.move(3,4));

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'move', from: [3], path: [0]}
            ]);
            expect(inversePatches).toEqual([
                {op: 'move', from: [0], path: [3]}
            ]);
        });

        test(`move with producePatches should wrap past start`, () => {
            const value = ['a','b','c','d'];
            const expectedNewValue = ['b','c','d','a'];

            const [newValue, patches, inversePatches] = producePatches(value, array.move(0,-1));

            expect(newValue).toEqual(expectedNewValue);
            expect(applyPatches(value, patches)).toEqual(expectedNewValue);
            expect(applyPatches(newValue, inversePatches)).toEqual(value);

            expect(patches).toEqual([
                {op: 'move', from: [0], path: [3]}
            ]);
            expect(inversePatches).toEqual([
                {op: 'move', from: [3], path: [0]}
            ]);
        });

        test(`move with Dendriform`, () => {
            const form = new Dendriform(['a','b','c','d']);

            expect(form.branch(0).id).toBe('1');
            expect(form.branch(1).id).toBe('2');
            expect(form.branch(2).id).toBe('3');
            expect(form.branch(3).id).toBe('4');

            form.set(array.move(3,1));

            expect(form.value).toEqual(['a','d','b','c']);
            expect(form.branch(0).id).toBe('1');
            expect(form.branch(1).id).toBe('4');
            expect(form.branch(2).id).toBe('2');
            expect(form.branch(3).id).toBe('3');
        });
    });
});
