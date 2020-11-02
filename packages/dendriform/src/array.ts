import type {ToProduce} from './producePatches';
import {patches} from './producePatches';

const addAt = (index: number, value: unknown) => [{op: 'add', path: [index], value}];
const removeAt = (index: number) => [{op: 'remove', path: [index]}];

export const array = {
    unshift: <V extends unknown[]>(value: V[0]): ToProduce<V> => {
        return patches(
            addAt(0, value),
            removeAt(0)
        );
    },
    shift: <V extends unknown[]>(): ToProduce<V> => {
        return patches(
            removeAt(0),
            (base) => addAt(0, base[0])
        );
    },
    push: <V extends unknown[]>(value: V[0]): ToProduce<V> => {
        return patches(
            (base) => addAt(base.length, value),
            (base) => removeAt(base.length)
        );
    },
    pop: <V extends unknown[]>(): ToProduce<V> => {
        return patches(
            (base) => removeAt(base.length - 1),
            (base) => addAt(base.length - 1, base[base.length - 1])
        );
    },
    remove: <V extends unknown>(): ToProduce<V> => {
        return patches(
            [{op: 'remove', path: []}],
            (base) => [{op: 'add', path: [], value: base}]
        );
    }
};
