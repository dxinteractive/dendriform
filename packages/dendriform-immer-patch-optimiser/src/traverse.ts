export const BASIC = 0;
export const OBJECT = 1;
export const ARRAY = 2;
export const MAP = 3;

export type DataType = typeof ARRAY|typeof OBJECT|typeof BASIC|typeof MAP;

const cantAccess = (thing: unknown, key: PropertyKey) => new Error(`Cant access property ${String(key)} of ${String(thing)}`);

export function getType(thing: unknown): DataType {
    if(thing instanceof Map) return MAP;
    if(Array.isArray(thing)) return ARRAY;
    if(thing instanceof Object) return OBJECT;
    return BASIC;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function has(thing: any, key: PropertyKey): boolean {
    const type = getType(thing);
    if(type === OBJECT) {
        return key in thing;
    }
    if(type === ARRAY) {
        const index = key as number;
        return index < thing.length && index > -1;
    }
    if(type === MAP) {
        return thing.has(key);
    }
    throw cantAccess(thing, key);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function get(thing: any, key: PropertyKey): unknown {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    if(type === MAP) {
        return thing.get(key);
    }
    return thing[key];
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function getIn(thing: unknown, path: PropertyKey[]): unknown {
    return path.reduce((red, key) => get(red, key), thing);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function set(thing: any, key: PropertyKey, value: unknown): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    if(type === MAP) {
        return thing.set(key, value);
    }
    thing[key] = value;
}

export type EachCallback = (value: unknown, key: PropertyKey) => void;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function each(thing: any, callback: EachCallback): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, 'any');
    }
    if(type === OBJECT) {
        Object.keys(thing).forEach((key: string) => callback(thing[key], key));
    }
    if(type === ARRAY || type === MAP) {
        thing.forEach(callback);
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function clone(thing: any): any {
    const type = getType(thing);
    if(type === OBJECT) return {...thing};
    if(type === ARRAY) return thing.slice();
    if(type === MAP) return new Map(thing);
    return thing;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function create(type: DataType): any {
    if(type === OBJECT) return {};
    if(type === ARRAY) return [];
    if(type === MAP) return new Map();
    return undefined;
}
