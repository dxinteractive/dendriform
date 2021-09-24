import {BASIC, OBJECT, ARRAY, MAP, SET, getType, has, get, getIn, set, entries, clone, create} from '../src/index';

describe(`getType`, () => {
    test(`should identify basics`, () => {
        expect(getType(undefined)).toBe(BASIC);
        expect(getType(null)).toBe(BASIC);
        expect(getType(1)).toBe(BASIC);
        expect(getType('string')).toBe(BASIC);
        expect(getType(false)).toBe(BASIC);
        expect(getType(true)).toBe(BASIC);
        expect(getType(NaN)).toBe(BASIC);
    });

    test(`should identify object`, () => {
        expect(getType({})).toBe(OBJECT);
    });

    test(`should identify array`, () => {
        expect(getType([])).toBe(ARRAY);
    });

    test(`should identify map`, () => {
        expect(getType(new Map())).toBe(MAP);
    });

    test(`should identify set`, () => {
        expect(getType(new Set())).toBe(SET);
    });
});

describe(`has`, () => {
    test(`should work with object`, () => {
        expect(has({foo: 123}, 'foo')).toBe(true);
        expect(has({foo: 123}, 'bar')).toBe(false);
    });

    test(`should work with array`, () => {
        expect(has(['a','b'], 1)).toBe(true);
        expect(has(['a','b'], 4)).toBe(false);
        expect(has(['a','b'], -1)).toBe(false);
    });

    test(`should error on basic types`, () => {
        expect(() => has(100, 4)).toThrow(`Cant access property 4 of 100`);
        expect(() => has("str", 4)).toThrow(`Cant access property 4 of str`);
        expect(() => has(null, 4)).toThrow(`Cant access property 4 of null`);
        expect(() => has(undefined, 4)).toThrow(`Cant access property 4 of undefined`);
    });

    test(`should work with map`, () => {
        const map = new Map<number,boolean>([[0,true],[2,false]]);
        expect(has(map, 0)).toBe(true);
        expect(has(map, 1)).toBe(false);
        expect(has(map, 2)).toBe(true);
    });

    test(`should work with set`, () => {
        const set = new Set<number>([0,2]);
        expect(has(set, 0)).toBe(true);
        expect(has(set, 1)).toBe(false);
        expect(has(set, 2)).toBe(true);
    });
});

describe(`get`, () => {
    test(`should work with object`, () => {
        expect(get({foo: 123}, 'foo')).toBe(123);
    });

    test(`should work with object and miss`, () => {
        expect(get({foo: 123}, 'bar')).toBe(undefined);
    });

    test(`should work with array`, () => {
        expect(get(['a','b'], 1)).toBe('b');
    });

    test(`should work with array and miss`, () => {
        expect(get(['a','b'], 4)).toBe(undefined);
    });

    test(`should work with map`, () => {
        const map = new Map<number,boolean>([[0,true],[2,false]]);
        expect(get(map, 2)).toBe(false);
    });

    test(`should work with map and miss`, () => {
        const map = new Map<number,boolean>([[0,true],[2,false]]);
        expect(get(map, 1)).toBe(undefined);
    });

    test(`should work with set`, () => {
        const set = new Set<number>([0,2]);
        expect(get(set, 2)).toBe(2);
    });

    test(`should work with set and miss`, () => {
        const set = new Set<number>([0,2]);
        expect(get(set, 1)).toBe(undefined);
    });

    test(`should error on basic types`, () => {
        expect(() => get(100, 4)).toThrow(`Cant access property 4 of 100`);
        expect(() => get("str", 4)).toThrow(`Cant access property 4 of str`);
        expect(() => get(null, 4)).toThrow(`Cant access property 4 of null`);
        expect(() => get(undefined, 4)).toThrow(`Cant access property 4 of undefined`);
    });
});

describe(`getIn`, () => {
    test(`should work with nested objects`, () => {
        expect(getIn({foo: {bar: 123}}, ['foo','bar'])).toBe(123);
    });

    test(`should work with nested objects and miss`, () => {
        expect(getIn({foo: {bar: 123}}, ['foo','baz'])).toBe(undefined);
        expect(getIn({foo: {bar: 123}}, ['baz'])).toBe(undefined);
        expect(getIn({foo: {bar: 123}}, [0])).toBe(undefined);
    });

    test(`should work with arrays`, () => {
        expect(getIn([['a','b']], [0,1])).toBe('b');
    });

    test(`should work with array and miss`, () => {
        expect(getIn([['a','b']], [0,4])).toBe(undefined);
        expect(getIn([['a','b']], [4])).toBe(undefined);
        expect(getIn([['a','b']], ['hello'])).toBe(undefined);
    });
});

describe(`set`, () => {
    test(`should work with object`, () => {
        const obj = {foo: 1, bar: 2};
        set(obj, 'foo', 3);
        expect(obj).toEqual({foo: 3, bar: 2});
    });

    test(`should work with array`, () => {
        const arr = [1,2,3];
        set(arr, 1, 20);
        expect(arr).toEqual([1,20,3]);
    });

    test(`should work with map`, () => {
        const map = new Map<number,boolean>([[0,true],[2,false]]);
        set(map, 2, true);
        expect(map.get(2)).toBe(true);
    });

    test(`should work with map`, () => {
        const s = new Set<number>([0,2]);
        set(s, 2, 3);
        expect(Array.from(s.values())).toEqual([0,3]);
    });

    test(`should error on basic types`, () => {
        expect(() => set(100, 4, 4)).toThrow(`Cant access property 4 of 100`);
        expect(() => set("str", 4, 4)).toThrow(`Cant access property 4 of str`);
        expect(() => set(null, 4, 4)).toThrow(`Cant access property 4 of null`);
        expect(() => set(undefined, 4, 4)).toThrow(`Cant access property 4 of undefined`);
    });
});


describe(`entries`, () => {
    test(`should work with object`, () => {
        const obj = {foo: 1, bar: 2};

        const result = entries(obj);
        expect(result).toEqual([['foo',1],['bar',2]]);
    });

    test(`should work with array`, () => {
        const arr = ['a','b','c'];

        const result = entries(arr);
        expect(result).toEqual([[0,'a'],[1,'b'],[2,'c']]);
    });

    test(`should work with map`, () => {
        const map = new Map([['foo', 1], ['bar', 2]]);

        const result = entries(map);
        expect(result).toEqual([['foo',1],['bar',2]]);
    });

    test(`should work with set`, () => {
        const set = new Set(['foo','bar']);

        const result = entries(set);
        expect(result).toEqual([['foo','foo'],['bar','bar']]);
    });

    test(`should error on basic types`, () => {
        expect(() => entries(100)).toThrow(`Cant access property any of 100`);
        expect(() => entries("str")).toThrow(`Cant access property any of str`);
        expect(() => entries(null)).toThrow(`Cant access property any of null`);
        expect(() => entries(undefined)).toThrow(`Cant access property any of undefined`);
    });
});

describe(`clone`, () => {
    test(`should work with basic`, () => {
        expect(clone('???')).toBe('???');
    });

    test(`should work with object`, () => {
        const obj = {foo: 1, bar: 2};
        const cloned = clone(obj);

        expect(cloned).not.toBe(obj);
        expect(cloned).toEqual(obj);
    });

    test(`should work with array`, () => {
        const arr = [1,2,3];
        const cloned = clone(arr);

        expect(cloned).not.toBe(arr);
        expect(cloned).toEqual(arr);
    });

    test(`should work with map`, () => {
        const map = new Map([['foo', 1], ['bar', 2]]);
        const cloned = clone(map);

        expect(cloned).not.toBe(map);
        expect(cloned.get('foo')).toBe(1);
        expect(cloned.get('bar')).toBe(2);
    });

    test(`should work with set`, () => {
        const set = new Set(['foo','bar']);
        const cloned = clone(set);

        expect(cloned).not.toBe(set);
        expect(Array.from(set.values())).toEqual(['foo','bar']);
    });
});

describe(`create`, () => {
    test(`BASIC should create undefined`, () => {
        expect(create(BASIC)).toBe(undefined);
    });

    test(`OBJECT should create object`, () => {
        expect(create(OBJECT)).toEqual({});
    });

    test(`ARRAY should create array`, () => {
        expect(create(ARRAY)).toEqual([]);
    });

    test(`MAP should create map`, () => {
        expect(create(MAP) instanceof Map).toBe(true);
    });

    test(`SET should create set`, () => {
        expect(create(SET) instanceof Set).toBe(true);
    });
});
