import {die} from '../src/index';

describe(`die`, () => {
    test(`should throw errors`, () => {
        expect(() => die(0, 123)).toThrow(`[Dendriform] Cannot find path of node 123`);
        expect(() => die(1, ['a',1])).toThrow(`[Dendriform] Cannot find node at path ["a",1]`);
        expect(() => die(2)).toThrow(`[Dendriform] branchAll() can only be called on forms containing arrays`);
        expect(() => die(3)).toThrow(`[Dendriform] renderAll() can only be called on forms containing arrays`);
        expect(() => die(4, ['foo'])).toThrow(`[Dendriform] useIndex() can only be called on array element forms, can't be called at path [\"foo\"]`);
    });

    test(`should throw unknown errors`, () => {
        // @ts-expect-error
        expect(() => die(-1, 123)).toThrow(`[Dendriform] unknown error #-1`);
    });
});

describe(`die (prod mode)`, () => {
    test(`should throw minified errors`, () => {
        global.__DEV__ = false;
        expect(() => die(0, 123, "woo")).toThrow(`[Dendriform] minified error #0: 123, "woo"`);
        expect(() => die(2)).toThrow(`[Dendriform] minified error #2:`);
    });
});

