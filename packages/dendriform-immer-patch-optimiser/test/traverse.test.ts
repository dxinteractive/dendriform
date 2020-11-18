import {BASIC, OBJECT, ARRAY, getType, get, getIn, set, each} from '../src/index';

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

    test(`should error on basic types`, () => {
        expect(() => set(100, 4, 4)).toThrow(`Cant access property 4 of 100`);
        expect(() => set("str", 4, 4)).toThrow(`Cant access property 4 of str`);
        expect(() => set(null, 4, 4)).toThrow(`Cant access property 4 of null`);
        expect(() => set(undefined, 4, 4)).toThrow(`Cant access property 4 of undefined`);
    });
});


describe(`each`, () => {
    test(`should work with object`, () => {
        const callback = jest.fn();
        const obj = {foo: 1, bar: 2};

        each(obj, callback);

        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback.mock.calls[0][0]).toBe(1);
        expect(callback.mock.calls[0][1]).toBe('foo');
        expect(callback.mock.calls[1][0]).toBe(2);
        expect(callback.mock.calls[1][1]).toBe('bar');
    });

    test(`should work with array`, () => {
        const callback = jest.fn();
        const arr = ['a','b','c'];

        each(arr, callback);

        expect(callback).toHaveBeenCalledTimes(3);
        expect(callback.mock.calls[0][0]).toBe('a');
        expect(callback.mock.calls[0][1]).toBe(0);
        expect(callback.mock.calls[1][0]).toBe('b');
        expect(callback.mock.calls[1][1]).toBe(1);
        expect(callback.mock.calls[2][0]).toBe('c');
        expect(callback.mock.calls[2][1]).toBe(2);
    });

    test(`should error on basic types`, () => {
        const callback = jest.fn();

        expect(() => each(100, callback)).toThrow(`Cant access property any of 100`);
        expect(() => each("str", callback)).toThrow(`Cant access property any of str`);
        expect(() => each(null, callback)).toThrow(`Cant access property any of null`);
        expect(() => each(undefined, callback)).toThrow(`Cant access property any of undefined`);

        expect(callback).toHaveBeenCalledTimes(0);
    });
});
