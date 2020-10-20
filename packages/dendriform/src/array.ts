import type {ToProduce} from './producePatches';

const addAt = (index: number, value: unknown) => [{op: 'add', path: [index], value}];
const removeAt = (index: number) => [{op: 'remove', path: [index]}];

export const array = {
    unshift: <V extends unknown[]>(value: V[0]): ToProduce<V> => ({
        __patches: () => addAt(0, value),
        __patchesInverse: () => removeAt(0)
    }),
    shift: <V extends unknown[]>(): ToProduce<V> => ({
        __patches: () => removeAt(0),
        __patchesInverse: (base) => addAt(0, base[0])
    }),
    push: <V extends unknown[]>(value: V[0]): ToProduce<V> => ({
        __patches: (base) => addAt(base.length, value),
        __patchesInverse: (base) => removeAt(base.length)
    }),
    pop: <V extends unknown[]>(): ToProduce<V> => ({
        __patches: (base) => removeAt(base.length - 1),
        __patchesInverse: (base) => addAt(base.length - 1, base[base.length - 1])
    }),
    remove: <V extends unknown>(): ToProduce<V> => ({
        __patches: () => [{op: 'remove', path: []}],
        __patchesInverse: (base) => [{op: 'add', path: [], value: base}]
    })
};
