import type {ToProduce} from './producePatches';
import {patches} from './producePatches';

const addAt = (index: number, value: unknown) => [{op: 'add', path: [index], value}];
const removeAt = (index: number) => [{op: 'remove', path: [index]}];

const unshift = <V extends unknown[]>(value: V[0]): ToProduce<V> => {
    return patches(
        addAt(0, value),
        removeAt(0)
    );
};

const shift = <V extends unknown[]>(): ToProduce<V> => {
    return patches(
        removeAt(0),
        (base) => addAt(0, base[0])
    );
};

const push = <V extends unknown[]>(value: V[0]): ToProduce<V> => {
    return patches(
        (base) => addAt(base.length, value),
        (base) => removeAt(base.length)
    );
};

const pop = <V extends unknown[]>(): ToProduce<V> => {
    return patches(
        (base) => removeAt(base.length - 1),
        (base) => addAt(base.length - 1, base[base.length - 1])
    );
};

const remove = <V extends unknown>(): ToProduce<V> => {
    return patches(
        [{op: 'remove', path: []}],
        (base) => [{op: 'add', path: [], value: base}]
    );
};

const move = <V extends unknown>(fromIndex: number, toIndex: number): ToProduce<V> => {
    const wrap = ({length}: unknown[], index: number): number => {
        if(index < 0) return index + length;
        if(index >= length) return index - length;
        return index;
    };
    return patches(
        (base) => [{
            op: 'move',
            from: [wrap(base as unknown[], fromIndex)],
            path: [wrap(base as unknown[], toIndex)]
        }],
        (base) => [{
            op: 'move',
            from: [wrap(base as unknown[], toIndex)],
            path: [wrap(base as unknown[], fromIndex)]
        }]
    );
};

export const array = {
    unshift,
    shift,
    push,
    pop,
    remove,
    move
};
