import {array} from '../src/index';
import {producePatches} from '../src/index';
import {Dendriform} from '../src/index';
import {applyPatches} from 'dendriform-immer-patch-optimiser';

describe(`array`, () => {
    test(`unshift with producePatches`, () => {
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

    test(`unshift with Dendriform`, () => {
        const form = new Dendriform(['a','b','c']);

        expect(form.get(0).id).toBe(1);
        expect(form.get(1).id).toBe(2);
        expect(form.get(2).id).toBe(3);

        form.produce(array.unshift('d'));
        form.core.changeBuffer.flush();

        expect(form.value).toEqual(['d','a','b','c']);
        expect(form.get(0).id).toBe(4);
        expect(form.get(1).id).toBe(1);
        expect(form.get(2).id).toBe(2);
        expect(form.get(3).id).toBe(3);
    });

    test(`push with producePatches`, () => {
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

    test(`push with Dendriform`, () => {
        const form = new Dendriform(['a','b','c']);

        form.produce(array.push('d'));
        form.core.changeBuffer.flush();

        expect(form.value).toEqual(['a','b','c','d']);
        expect(form.get(0).id).toBe(1);
        expect(form.get(1).id).toBe(2);
        expect(form.get(2).id).toBe(3);
        expect(form.get(3).id).toBe(4);
    });

    test(`pop with producePatches`, () => {
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

    test(`pop with Dendriform`, () => {
        const form = new Dendriform(['a','b','c']);

        form.produce(array.pop());
        form.core.changeBuffer.flush();

        expect(form.value).toEqual(['a','b']);
        expect(form.get(0).id).toBe(1);
        expect(form.get(1).id).toBe(2);
    });

    test(`shift with producePatches`, () => {
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

    test(`shift with Dendriform`, () => {
        const form = new Dendriform(['a','b','c']);

        form.produce(array.shift());
        form.core.changeBuffer.flush();

        expect(form.value).toEqual(['b','c']);
        expect(form.get(0).id).toBe(2);
        expect(form.get(1).id).toBe(3);
    });

    test(`remove with producePatches`, () => {
        const [, patches, inversePatches] = producePatches('a', array.remove());
        // ignore newValue in this case
        // Dendriform doesnt use it anyway
        // TODO handle the case where remove() is called at top level
        // perhaps this should deliberately error out
        expect(patches).toEqual([
            {op: 'remove', path: []}
        ]);
        expect(inversePatches).toEqual([
            {op: 'add', path: [], value: 'a'}
        ]);
    });

    test(`remove with Dendriform`, () => {
        const form = new Dendriform(['a','b','c']);

        form.get(0).produce(array.remove());
        form.core.changeBuffer.flush();

        expect(form.value).toEqual(['b','c']);
        expect(form.get(0).id).toBe(2);
        expect(form.get(1).id).toBe(3);
    });

    test(`unshift deep with Dendriform`, () => {
        const form = new Dendriform({
            foo: [
                {name: 'a'},
                {name: 'b'},
                {name: 'c'}
            ]
        });

        form.get('foo').produce(array.unshift({name: 'd'}));
        form.core.changeBuffer.flush();

        expect(form.value).toEqual({
            foo: [
                {name: 'd'},
                {name: 'a'},
                {name: 'b'},
                {name: 'c'}
            ]
        });

        expect(form.get(['foo',0]).id).toBe(5);
        expect(form.get(['foo',1]).id).toBe(2);
        expect(form.get(['foo',2]).id).toBe(3);
        expect(form.get(['foo',3]).id).toBe(4);
    });
});
