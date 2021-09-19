import {produceWithPatches, nothing, enableMapSet} from 'immer';
import {optimise, applyPatches} from '../src/index';
import type {Patch as ImmerPatch} from 'immer';
import type {DendriformPatch} from '../src/types';

enableMapSet();

type Expected = {
    vanilla: ImmerPatch[],
    optimised: DendriformPatch[]
};

function runTest<B>(
    base: B,
    producer: (b: B) => unknown,
    expectedResult: unknown,
    expected: Expected
): void {
    const [result, recordedPatches] = produceWithPatches(base, producer);

    test(`sanity check: immer should produce correct result`, () => {
        expect(result).toEqual(expectedResult);
    });

    test(`sanity check: immer should produce correct patches`, () => {
        expect(recordedPatches).toEqual(expected.vanilla);
    });

    test(`optimise should produce correct patches`, () => {
        const optimisedPatches = optimise(base, recordedPatches);
        expect(optimisedPatches).toEqual(expected.optimised);
    });

    test(`applying optimised patches should produce correct result`, () => {
        const optimisedPatches = optimise(base, recordedPatches);
        expect(applyPatches(base, optimisedPatches)).toEqual(expectedResult);
    });
}

describe(`pop`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.pop();
        },
        ['a','b'],
        {
            vanilla: [
                {op: 'replace', path: ['length'], value: 2}
            ],
            optimised: [
                {op: 'replace', path: ['length'], value: 2}
            ]
        }
    );
});

describe(`pop x2`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.pop();
            d.pop();
        },
        ['a'],
        {
            vanilla: [
                {op: 'replace', path: ['length'], value: 1}
            ],
            optimised: [
                {op: 'replace', path: ['length'], value: 1}
            ]
        }
    );
});

describe(`shift`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.shift();
        },
        ['b','c'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'b'},
                {op: 'replace', path: [1], value: 'c'},
                {op: 'replace', path: ['length'], value: 2}
            ],
            optimised: [
                {op: 'move', from: [1], path: [0]},
                {op: 'move', from: [2], path: [1]},
                {op: 'replace', path: ['length'], value: 2}
            ]
        }
    );
});

describe(`shift x2`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.shift();
            d.shift();
        },
        ['c'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'c'},
                {op: 'replace', path: ['length'], value: 1}
            ],
            optimised: [
                {op: 'move', from: [2], path: [0]},
                {op: 'replace', path: ['length'], value: 1}
            ]
        }
    );
});

describe(`push`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.push('d');
        },
        ['a','b','c','d'],
        {
            vanilla: [
                {op: 'add', path: [3], value: 'd'}
            ],
            optimised: [
                {op: 'add', path: [3], value: 'd'}
            ]
        }
    );
});

describe(`push x2`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.push('d');
            d.push('e');
        },
        ['a','b','c','d','e'],
        {
            vanilla: [
                {op: 'add', path: [3], value: 'd'},
                {op: 'add', path: [4], value: 'e'}
            ],
            optimised: [
                {op: 'add', path: [3], value: 'd'},
                {op: 'add', path: [4], value: 'e'}
            ]
        }
    );
});


describe(`unshift`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.unshift('d');
        },
        ['d','a','b','c'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'd'},
                {op: 'replace', path: [1], value: 'a'},
                {op: 'replace', path: [2], value: 'b'},
                {op: 'add', path: [3], value: 'c'}
            ],
            optimised: [
                {op: 'add', path: [0], value: 'd'}
            ]
        }
    );
});

describe(`unshift x2`, () => {
    runTest(
        ['a','b','c'],
        d => {
            d.unshift('d');
            d.unshift('e');
        },
        ['e','d','a','b','c'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'e'},
                {op: 'replace', path: [1], value: 'd'},
                {op: 'replace', path: [2], value: 'a'},
                {op: 'add', path: [3], value: 'b'},
                {op: 'add', path: [4], value: 'c'}
            ],
            optimised: [
                {op: 'add', path: [0], value: 'e'},
                {op: 'add', path: [1], value: 'd'}
            ]
        }
    );
});

describe(`reverse`, () => {
    runTest(
        ['a','b','c','d','e'],
        d => {
            d.reverse();
        },
        ['e','d','c','b','a'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'e'},
                {op: 'replace', path: [1], value: 'd'},
                {op: 'replace', path: [3], value: 'b'},
                {op: 'replace', path: [4], value: 'a'}
            ],
            optimised: [
                {op: 'move', from: [4], path: [0]},
                {op: 'move', from: [4], path: [1]},
                {op: 'move', from: [4], path: [2]},
                {op: 'move', from: [4], path: [3]}
            ]
        }
    );
});

describe(`reverse with adds and removes`, () => {
    runTest(
        ['a','b','X','Y','c','d','e','Z'],
        d => {
            d.splice(2,2);
            d.pop();
            d.reverse();
            d.push('C');
            d.splice(3, 0, 'B');
            d.unshift('A');
        },
        ['A','e','d','c','B','b','a','C'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'A'},
                {op: 'replace', path: [1], value: 'e'},
                {op: 'replace', path: [2], value: 'd'},
                {op: 'replace', path: [3], value: 'c'},
                {op: 'replace', path: [4], value: 'B'},
                {op: 'replace', path: [5], value: 'b'},
                {op: 'replace', path: [6], value: 'a'},
                {op: 'replace', path: [7], value: 'C'}
            ],
            optimised: [
                {op: 'move', from: [6], path: [0]},
                {op: 'move', from: [6], path: [1]},
                {op: 'move', from: [6], path: [2]},
                {op: 'move', from: [4], path: [3]},
                {op: 'replace', path: ['length'], value: 5},
                {op: 'add', path: [0], value: 'A'},
                {op: 'add', path: [4], value: 'B'},
                {op: 'add', path: [7], value: 'C'}
            ]
        }
    );
});

describe(`sort`, () => {
    runTest(
        ['e','b','a','c','d'],
        d => {
            d.sort();
        },
        ['a','b','c','d','e'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'a'},
                {op: 'replace', path: [2], value: 'c'},
                {op: 'replace', path: [3], value: 'd'},
                {op: 'replace', path: [4], value: 'e'}
            ],
            optimised: [
                {op: 'move', from: [2], path: [0]},
                {op: 'move', from: [2], path: [1]},
                {op: 'move', from: [3], path: [2]},
                {op: 'move', from: [4], path: [3]}
            ]
        }
    );
});

describe(`splice`, () => {
    runTest(
        ['a','b','c','d'],
        d => {
            d.splice(2, 0, 'e');
        },
        ['a','b','e','c','d'],
        {
            vanilla: [
                {op: 'replace', path: [2], value: 'e'},
                {op: 'replace', path: [3], value: 'c'},
                {op: 'add', path: [4], value: 'd'}
            ],
            optimised: [
                {op: 'add', path: [2], value: 'e'}
            ]
        }
    );
});

describe(`splice x2`, () => {
    runTest(
        ['a','b','c','d'],
        d => {
            d.splice(2, 0, 'e');
            d.splice(1, 0, 'f');
        },
        ['a','f','b','e','c','d'],
        {
            vanilla: [
                {op: 'replace', path: [1], value: 'f'},
                {op: 'replace', path: [2], value: 'b'},
                {op: 'replace', path: [3], value: 'e'},
                {op: 'add', path: [4], value: 'c'},
                {op: 'add', path: [5], value: 'd'}
            ],
            optimised: [
                {op: 'add', path: [1], value: 'f'},
                {op: 'add', path: [3], value: 'e'}
            ]
        }
    );
});

describe(`splice remove unshift`, () => {
    // contains items that:
    // - dont move, so arent mentioned in patches
    // - do move
    // - are new
    runTest(
        ['a','b','c','d'],
        d => {
            d.splice(2, 1);
            d.push('e','f');
        },
        ['a','b','d','e','f'],
        {
            vanilla: [
                {op: 'replace', path: [2], value: 'd'},
                {op: 'replace', path: [3], value: 'e'},
                {op: 'add', path: [4], value: 'f'}
            ],
            optimised: [
                {op: 'move', from: [3], path: [2]},
                {op: 'replace', path: ['length'], value: 3},
                {op: 'add', path: [3], value: 'e'},
                {op: 'add', path: [4], value: 'f'}
            ]
        }
    );
});

describe(`splice remove unshift with object references involved`, () => {
    // contains items that:
    // - dont move, so arent mentioned in patches
    // - do move
    // - are new
    runTest(
        [{i:'a'},{i:'b'},{i:'c'},{i:'d'}],
        d => {
            d.splice(2, 1);
            d.push({i:'e'},{i:'f'});
        },
        [{i:'a'},{i:'b'},{i:'d'},{i:'e'},{i:'f'}],
        {
            vanilla: [
                {op: 'replace', path: [2], value: {i:'d'}},
                {op: 'replace', path: [3], value: {i:'e'}},
                {op: 'add', path: [4], value: {i:'f'}}
            ],
            optimised: [
                {op: 'move', from: [3], path: [2]},
                {op: 'replace', path: ['length'], value: 3},
                {op: 'add', path: [3], value: {i:'e'}},
                {op: 'add', path: [4], value: {i:'f'}}
            ]
        }
    );
});

describe(`change deep arrays`, () => {
    runTest(
        {
            foo: {
                bar: ['a','b','c']
            },
            baz: 'baz',
            qux: []
        },
        d => {
            d.foo.bar.reverse();
            d.baz = 'baz?';
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            d.qux.push('qux');
        },
        {
            foo: {
                bar: ['c','b','a']
            },
            baz: 'baz?',
            qux: ['qux']
        },
        {
            vanilla: [
                {op: 'replace', path: ['foo','bar',0], value: 'c'},
                {op: 'replace', path: ['foo','bar',2], value: 'a'},
                {op: 'add', path: ['qux', 0], value: 'qux'},
                {op: 'replace', path: ['baz'], value: 'baz?'}
            ],
            optimised: [
                {op: 'move', from: ['foo','bar',2], path: ['foo','bar',0]},
                {op: 'move', from: ['foo','bar',2], path: ['foo','bar',1]},
                {op: 'add', path: ['qux', 0], value: 'qux'},
                {op: 'replace', path: ['baz'], value: 'baz?'}
            ]
        }
    );
});

// TODO - cope with mutiple identical objects
describe.skip(`sort with mutiple identical objects`, () => {
    runTest(
        ['b','a','c','a','c','b','a'],
        d => {
            d.pop();
            d.sort();
        },
        ['a','a','b','b','c','c'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'a'},
                {op: 'replace', path: [2], value: 'b'},
                {op: 'replace', path: [3], value: 'b'},
                {op: 'replace', path: [5], value: 'b'},
                {op: 'replace', path: ['length'], value: 6}
            ],
            optimised: [
                {op: 'replace', path: ['length'], value: 6}, // bacacb
                {op: 'move', from: [1], path: [0]}, // abcacb
                {op: 'move', from: [3], path: [1]}, // aabccb
                {op: 'move', from: [5], path: [3]} // aabbcc
            ]
        }
    );
});

describe(`filter with returned arrays`, () => {
    runTest(
        ['a','b','c','d','e'],
        d => {
            return d.filter(letter => 'abe'.indexOf(letter) !== -1);
        },
        ['a','b','e'],
        {
            vanilla: [
                {op: 'replace', path: [], value: ['a','b','e']}
            ],
            optimised: [
                {op: 'move', from: [4], path: [2]},
                {op: 'replace', path: ['length'], value: 3}
            ]
        }
    );
});

describe(`do nothing special with replacement values of non-array types`, () => {
    runTest(
        ['a','b','c','d','e'],
        () => 123,
        123,
        {
            vanilla: [
                {op: 'replace', path: [], value: 123}
            ],
            optimised: [
                {op: 'replace', path: [], value: 123}
            ]
        }
    );
});

describe('immer: confirm that explicit returns dont needlessly replace object references', () => {
    test(`immer should produces correct result`, () => {
        const a = {thing: 'a'};
        const b = {thing: 'b'};
        const c = {thing: 'c'};
        const d = {thing: 'd'};
        const base = [a,b,c];

        const [result, patches] = produceWithPatches(base, draft => draft.map(item => item.thing !== 'b' ? item : d));

        expect(result[0]).toBe(a);
        expect(result[1]).toBe(d);
        expect(result[2]).toBe(c);
        expect(patches).toEqual([{op: 'replace', path: [], value: [a,d,c]}]);
    });

    test(`immer should produces correct result when nested`, () => {
        const a = {thing: 'a'};
        const b = {thing: 'b'};
        const c = {thing: 'c'};
        const d = {thing: 'd'};
        const base = {arr: [a,b,c]};

        const [result, patches] = produceWithPatches(base, draft => {
            draft.arr = draft.arr.map(item => item.thing !== 'b' ? item : d);
        });

        expect(result.arr[0]).toBe(a);
        expect(result.arr[1]).toBe(d);
        expect(result.arr[2]).toBe(c);
        expect(patches).toEqual([{op: 'replace', path: ['arr'], value: [a,d,c]}]);
    });
});

describe('immer bug fix: nothings in patches should be replaced with undefineds', () => {

    test(`optimise should produce correct patches`, () => {
        const base = {abc: 123};
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const [result, recordedPatches] = produceWithPatches(base, () => nothing);

        expect(result).toBe(undefined);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        expect(recordedPatches[0].value).toBe(nothing);
        // ^ this is the immer bug

        const optimisedPatches = optimise(base, recordedPatches);
        expect(optimisedPatches[0].value).toBe(undefined);
    });

});

describe('immer Set patches', () => {


    it('demonstrate immer Set patches with numbers', () => {
        const base = new Set([0,1,2]);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const [result, recordedPatches] = produceWithPatches(base, draft => {
            draft.delete(2);
            draft.add(3);
        });

        expect(recordedPatches).toEqual([
            {op: 'remove', path: [2], value: 2},
            {op: 'add', path: [2], value: 3}
        ]);
    });

    it('demonstrate immer Set patches with strings', () => {
        const base = new Set(['a','b','c']);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const [result, recordedPatches] = produceWithPatches(base, draft => {
            draft.delete('b');
            draft.add('d');
        });

        expect(recordedPatches).toEqual([
            {op: 'remove', path: [1], value: 'b'},
            {op: 'add', path: [2], value: 'd'}
        ]);
    });

    it('demonstrate immer Set patches with objects', () => {
        const obj1 = {foo: true};
        const obj2 = {bar: true};
        const obj3 = {baz: true};
        const base = new Set<{[key: string]: boolean}>([obj1, obj2]);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const [result, recordedPatches] = produceWithPatches(base, draft => {
            draft.delete(obj1);
            draft.add(obj3);
        });

        expect(recordedPatches).toEqual([
            {op: 'remove', path: [0], value: obj1},
            {op: 'add', path: [0], value: obj3}
        ]);
    });
});
