import {diff} from '../src/index';
import {BASIC, OBJECT, ARRAY} from 'dendriform-immer-patch-optimiser';

import type {Nodes} from '../src/Nodes';

const SINGLE_NODE = {
    '0': {
        child: undefined,
        id: '0',
        parentId: '',
        type: BASIC
    }
} as Nodes;

const BASIC_DATA = {
    value: 100,
    nodes: SINGLE_NODE
};

const OBJECT_DATA = {
    value: {
        foo: 100,
        bar: 200,
        baz: 300
    },
    nodes: SINGLE_NODE
};

const OBJECT_DATA_2 = {
    value: {
        bar: 222,
        baz: 300,
        qux: 400
    },
    nodes: SINGLE_NODE
};

const ARRAY_DATA = {
    value: ['a','b','c'],
    nodes: {
        '0': {
            child: ['1','2','3'],
            id: '0',
            parentId: '',
            type: ARRAY
        },
        '1': {
            child: undefined,
            id: '1',
            parentId: '',
            type: BASIC
        },
        '2': {
            child: undefined,
            id: '2',
            parentId: '',
            type: BASIC
        },
        '3': {
            child: undefined,
            id: '3',
            parentId: '',
            type: BASIC
        }
    } as Nodes
};

const ARRAY_DATA_2 = {
    value: ['b','z','d'],
    nodes: {
        '0': {
            child: ['2','3','4'],
            id: '0',
            parentId: '',
            type: ARRAY
        },
        '1': {
            child: undefined,
            id: '1',
            parentId: '',
            type: BASIC
        },
        '2': {
            child: undefined,
            id: '2',
            parentId: '',
            type: BASIC
        },
        '3': {
            child: undefined,
            id: '3',
            parentId: '',
            type: BASIC
        }
    } as Nodes
};

const DEEP_NODE = {
    '0': {
        child: {
            woo: '1'
        },
        id: '0',
        parentId: '',
        type: OBJECT
    },
    '1': {
        child: undefined,
        id: '1',
        parentId: '',
        type: OBJECT
    }
} as Nodes;

const OBJECT_DATA_DEEP = {
    value: {
        // value is already "deep"
        foo: 100,
        bar: 200,
        baz: 300
    },
    nodes: DEEP_NODE
};

const OBJECT_DATA_DEEP_2 = {
    value: {
        // value is already "deep"
        bar: 222,
        baz: 300,
        qux: 400
    },
    nodes: DEEP_NODE
};

describe(`diff`, () => {
    test(`basic to basic`, () => {
        const diffs = diff({
            prev: BASIC_DATA,
            next: BASIC_DATA,
            id: '0'
        });

        expect(diffs).toEqual([
            [],
            [],
            []
        ]);
    });

    test(`basic to object`, () => {
        const diffs = diff<number|{[key: string]: number}>({
            prev: BASIC_DATA,
            next: OBJECT_DATA,
            id: '0'
        });

        expect(diffs).toEqual([
            [
                {
                    key: 'foo',
                    value: 100
                },
                {
                    key: 'bar',
                    value: 200
                },
                {
                    key: 'baz',
                    value: 300
                }
            ],
            [],
            []
        ]);
    });

    test(`object to basic`, () => {
        const diffs = diff<number|{[key: string]: number}>({
            prev: OBJECT_DATA,
            next: BASIC_DATA,
            id: '0'
        });

        expect(diffs).toEqual([
            [],
            [
                {
                    key: 'foo',
                    value: 100
                },
                {
                    key: 'bar',
                    value: 200
                },
                {
                    key: 'baz',
                    value: 300
                }
            ],
            []
        ]);
    });

    test(`object to object 2`, () => {
        const diffs = diff<{[key: string]: number}>({
            prev: OBJECT_DATA,
            next: OBJECT_DATA_2,
            id: '0'
        });

        expect(diffs).toEqual([
            [
                {
                    key: 'qux',
                    value: 400
                }
            ],
            [
                {
                    key: 'foo',
                    value: 100
                }
            ],
            [
                {
                    key: 'bar',
                    value: 222
                }
            ]
        ]);
    });

    test(`object to array`, () => {
        const diffs = diff<string[]|{[key: string]: number}>({
            prev: OBJECT_DATA,
            next: ARRAY_DATA,
            id: '0'
        });

        expect(diffs).toEqual([
            [
                {
                    key: 0,
                    value: 'a'
                },
                {
                    key: 1,
                    value: 'b'
                },
                {
                    key: 2,
                    value: 'c'
                }
            ],
            [
                {
                    key: 'foo',
                    value: 100
                },
                {
                    key: 'bar',
                    value: 200
                },
                {
                    key: 'baz',
                    value: 300
                }
            ],
            []
        ]);
    });

    test(`array to array 2`, () => {
        const diffs = diff<string[]|{[key: string]: number}>({
            prev: ARRAY_DATA,
            next: ARRAY_DATA_2,
            id: '0'
        });

        expect(diffs).toEqual([
            [
                {
                    key: 2,
                    value: 'd'
                }
            ],
            [
                {
                    key: 0,
                    value: 'a'
                }
            ],
            [
                {
                    key: 1,
                    value: 'z'
                }
            ]
        ]);
    });

    test(`array to array 2 without calculating updated`, () => {
        const diffs = diff<string[]|{[key: string]: number}>({
            prev: ARRAY_DATA,
            next: ARRAY_DATA_2,
            id: '0'
        }, {calculateUpdated: false});

        expect(diffs).toEqual([
            [
                {
                    key: 2,
                    value: 'd'
                }
            ],
            [
                {
                    key: 0,
                    value: 'a'
                }
            ],
            []
        ]);
    });

    test(`object to object 2 deep`, () => {
        const diffs = diff<{[key: string]: number}>({
            prev: OBJECT_DATA_DEEP,
            next: OBJECT_DATA_DEEP_2,
            id: '1'
        });

        expect(diffs).toEqual([
            [
                {
                    key: 'qux',
                    value: 400
                }
            ],
            [
                {
                    key: 'foo',
                    value: 100
                }
            ],
            [
                {
                    key: 'bar',
                    value: 222
                }
            ]
        ]);
    });
});
