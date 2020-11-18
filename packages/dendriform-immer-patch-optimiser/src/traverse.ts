export const BASIC = 0;
export const OBJECT = 1;
export const ARRAY = 2;

const cantAccess = (thing: unknown, key: PropertyKey) => new Error(`Cant access property ${String(key)} of ${String(thing)}`);

export function assertCollection(thing: unknown, key: PropertyKey): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
}

export function getType(thing: unknown): typeof ARRAY|typeof OBJECT|typeof BASIC {
    if(Array.isArray(thing)) return ARRAY;
    if(thing instanceof Object) return OBJECT;
    return BASIC;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function get(thing: any, key: PropertyKey): unknown {
    assertCollection(thing, key);
    return thing[key];
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function getIn(thing: unknown, path: PropertyKey[]): unknown {
    return path.reduce((red, key) => get(red, key), thing);
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function set(thing: any, key: PropertyKey, value: unknown): void {
    assertCollection(thing, key);
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
    if(type === ARRAY) {
        thing.forEach(callback);
    }
}
