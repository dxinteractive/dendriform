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

const A = {id: 'a'};
const B = {id: 'b'};
const C = {id: 'c'};
const D = {id: 'd'};
const E = {id: 'e'};
const F = {id: 'f'};
const Z = {id: 'z'};

describe(`pop`, () => {
    runTest(
        [A,B,C],
        d => {
            d.pop();
        },
        [A,B],
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
        [A,B,C],
        d => {
            d.pop();
            d.pop();
        },
        [A],
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
        [A,B,C],
        d => {
            d.shift();
        },
        [B,C],
        {
            vanilla: [
                {op: 'replace', path: [0], value: B},
                {op: 'replace', path: [1], value: C},
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
        [A,B,C],
        d => {
            d.shift();
            d.shift();
        },
        [C],
        {
            vanilla: [
                {op: 'replace', path: [0], value: C},
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
        [A,B,C],
        d => {
            d.push(D);
        },
        [A,B,C,D],
        {
            vanilla: [
                {op: 'add', path: [3], value: D}
            ],
            optimised: [
                {op: 'add', path: [3], value: D}
            ]
        }
    );
});

describe(`push x2`, () => {
    runTest(
        [A,B,C],
        d => {
            d.push(D);
            d.push(E);
        },
        [A,B,C,D,E],
        {
            vanilla: [
                {op: 'add', path: [3], value: D},
                {op: 'add', path: [4], value: E}
            ],
            optimised: [
                {op: 'add', path: [3], value: D},
                {op: 'add', path: [4], value: E}
            ]
        }
    );
});


describe(`unshift`, () => {
    runTest(
        [A,B,C],
        d => {
            d.unshift(D);
        },
        [D,A,B,C],
        {
            vanilla: [
                {op: 'replace', path: [0], value: D},
                {op: 'replace', path: [1], value: A},
                {op: 'replace', path: [2], value: B},
                {op: 'add', path: [3], value: C}
            ],
            optimised: [
                {op: 'add', path: [0], value: D}
            ]
        }
    );
});

describe(`unshift x2`, () => {
    runTest(
        [A,B,C],
        d => {
            d.unshift(D);
            d.unshift(E);
        },
        [E,D,A,B,C],
        {
            vanilla: [
                {op: 'replace', path: [0], value: E},
                {op: 'replace', path: [1], value: D},
                {op: 'replace', path: [2], value: A},
                {op: 'add', path: [3], value: B},
                {op: 'add', path: [4], value: C}
            ],
            optimised: [
                {op: 'add', path: [0], value: E},
                {op: 'add', path: [1], value: D}
            ]
        }
    );
});

describe(`reverse`, () => {
    runTest(
        [A,B,C,D,E],
        d => {
            d.reverse();
        },
        [E,D,C,B,A],
        {
            vanilla: [
                {op: 'replace', path: [0], value: E},
                {op: 'replace', path: [1], value: D},
                {op: 'replace', path: [3], value: B},
                {op: 'replace', path: [4], value: A}
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
        [A,B,C,D,E,F],
        d => {
            d.splice(2,2);     // abef
            d.pop();           // abe
            d.reverse();       // eba
            d.push(C);         // ebac
            d.splice(3, 0, Z); // ebazc
        },
        [E,B,A,Z,C],
        {
            vanilla: [
                {op: 'replace', path: [0], value: E},
                {op: 'replace', path: [2], value: A},
                {op: 'replace', path: [3], value: Z},
                {op: 'replace', path: [4], value: C},
                {op: 'replace', path: ['length'], value: 5}
            ],
            optimised: [
                {op: 'move', from: [4], path: [0]},
                {op: 'move', from: [2], path: [1]},
                {op: 'replace', path: ['length'], value: 4},
                {op: 'add', path: [3], value: Z}
            ]
        }
    );
});

describe(`sort`, () => {
    runTest(
        [E,B,A,C,D],
        d => {
            d.sort((a, b) => {
                if(a.id > b.id) return 1;
                if(a.id < b.id) return -1;
                return 0;
            });
        },
        [A,B,C,D,E],
        {
            vanilla: [
                {op: 'replace', path: [0], value: A},
                {op: 'replace', path: [2], value: C},
                {op: 'replace', path: [3], value: D},
                {op: 'replace', path: [4], value: E}
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
        [A,B,C,D],
        d => {
            d.splice(2, 0, E);
        },
        [A,B,E,C,D],
        {
            vanilla: [
                {op: 'replace', path: [2], value: E},
                {op: 'replace', path: [3], value: C},
                {op: 'add', path: [4], value: D}
            ],
            optimised: [
                {op: 'add', path: [2], value: E}
            ]
        }
    );
});

describe(`splice x2`, () => {
    runTest(
        [A,B,C,D],
        d => {
            d.splice(2, 0, E);
            d.splice(1, 0, F);
        },
        [A,F,B,E,C,D],
        {
            vanilla: [
                {op: 'replace', path: [1], value: F},
                {op: 'replace', path: [2], value: B},
                {op: 'replace', path: [3], value: E},
                {op: 'add', path: [4], value: C},
                {op: 'add', path: [5], value: D}
            ],
            optimised: [
                {op: 'add', path: [1], value: F},
                {op: 'add', path: [3], value: E}
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
        [A,B,C,D],
        d => {
            d.splice(2, 1);
            d.push(E,F);
        },
        [A,B,D,E,F],
        {
            vanilla: [
                {op: 'replace', path: [2], value: D},
                {op: 'replace', path: [3], value: E},
                {op: 'add', path: [4], value: F}
            ],
            optimised: [
                {op: 'move', from: [3], path: [2]},
                {op: 'replace', path: ['length'], value: 3},
                {op: 'add', path: [3], value: E},
                {op: 'add', path: [4], value: F}
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
        [{i:A},{i:B},{i:C},{i:D}],
        d => {
            d.splice(2, 1);
            d.push({i:E},{i:F});
        },
        [{i:A},{i:B},{i:D},{i:E},{i:F}],
        {
            vanilla: [
                {op: 'replace', path: [2], value: {i:D}},
                {op: 'replace', path: [3], value: {i:E}},
                {op: 'add', path: [4], value: {i:F}}
            ],
            optimised: [
                {op: 'move', from: [3], path: [2]},
                {op: 'replace', path: ['length'], value: 3},
                {op: 'add', path: [3], value: {i:E}},
                {op: 'add', path: [4], value: {i:F}}
            ]
        }
    );
});

describe(`change deep arrays`, () => {
    runTest(
        {
            foo: {
                bar: [A,B,C]
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
                bar: [C,B,A]
            },
            baz: 'baz?',
            qux: ['qux']
        },
        {
            vanilla: [
                {op: 'replace', path: ['foo','bar',0], value: C},
                {op: 'replace', path: ['foo','bar',2], value: A},
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

describe(`sort with mutiple identical values`, () => {
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
                {op: 'replace', path: [5], value: 'c'},
                {op: 'replace', path: ['length'], value: 6}
            ],
            optimised: [
                {op: 'replace', path: [0], value: 'a'},
                {op: 'replace', path: [2], value: 'b'},
                {op: 'replace', path: [3], value: 'b'},
                {op: 'replace', path: [5], value: 'c'},
                {op: 'replace', path: ['length'], value: 6}
            ]
        }
    );

    runTest(
        ['a','b','c','a','a'],
        d => {
            d.shift();
        },
        ['b','c','a','a'],
        {
            vanilla: [
                {op: 'replace', path: [0], value: 'b'},
                {op: 'replace', path: [1], value: 'c'},
                {op: 'replace', path: [2], value: 'a'},
                {op: 'replace', path: ['length'], value: 4}
            ],
            optimised: [
                {op: 'replace', path: [0], value: 'b'},
                {op: 'replace', path: [1], value: 'c'},
                {op: 'replace', path: [2], value: 'a'},
                {op: 'replace', path: ['length'], value: 4}
            ]
        }
    );
});

describe(`filter with returned arrays`, () => {
    runTest(
        [A,B,C,D,E],
        d => {
            return d.filter(obj => 'abe'.indexOf(obj.id) !== -1);
        },
        [A,B,E],
        {
            vanilla: [
                {op: 'replace', path: [], value: [A,B,E]}
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
        [A,B,C,D,E],
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
