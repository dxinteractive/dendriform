import type {Key} from './types';

export const BASIC = 0;
export const OBJECT = 1;
export const ARRAY = 2;
export const MAP = 3;
export const SET = 4;

export type DataType = typeof ARRAY|typeof OBJECT|typeof BASIC|typeof MAP|typeof SET;

const cantAccess = (thing: unknown, key: Key) => new Error(`Cant access property ${String(key)} of ${String(thing)}`);

export function getType(thing: unknown): DataType {
    if(thing instanceof Map) return MAP;
    if(thing instanceof Set) return SET;
    if(Array.isArray(thing)) return ARRAY;
    if(thing instanceof Object) return OBJECT;
    return BASIC;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function has(thing: any, key: Key): boolean {
    const type = getType(thing);
    if(type === OBJECT) {
        return key in thing;
    }
    if(type === ARRAY) {
        const index = key as number;
        return index < thing.length && index > -1;
    }
    if(type === MAP || type === SET) {
        return thing.has(key);
    }
    throw cantAccess(thing, key);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function get(thing: any, key: Key): unknown {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    if(type === MAP) {
        return thing.get(key);
    }
    if(type === SET) {
        return thing.has(key) ? key : undefined;
    }
    return thing[key];
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function getIn(thing: unknown, path: Key[]): unknown {
    return path.reduce((red, key) => get(red, key), thing);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function set(thing: any, key: Key, value: unknown): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    if(type === MAP) {
        return thing.set(key, value);
    }
    if(type === SET) {
        thing.delete(key);
        thing.add(value);
        return;
    }
    thing[key] = value;
}

export type EachCallback = (value: unknown, key: Key) => void;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function entries(thing: any): [Key,any][] {
    const type = getType(thing);
    if(type === OBJECT) return Object.entries(thing);
    if(type === ARRAY || type === MAP || type === SET) return Array.from(thing.entries());
    throw cantAccess(thing, 'any');
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function clone(thing: any): any {
    const type = getType(thing);
    if(type === OBJECT) return {...thing};
    if(type === ARRAY) return thing.slice();
    if(type === MAP) return new Map(thing);
    if(type === SET) return new Set(thing);
    return thing;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function create(type: DataType): any {
    if(type === OBJECT) return {};
    if(type === ARRAY) return [];
    if(type === MAP) return new Map();
    if(type === SET) return new Set();
    return undefined;
}
