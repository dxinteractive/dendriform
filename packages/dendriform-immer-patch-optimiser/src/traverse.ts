export const BASIC = 0;
export const OBJECT = 1;
export const ARRAY = 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cantAccess = (thing: any, key: any) => new Error(`Cant access property ${key} of ${thing}`);

export function getType(thing: unknown): typeof ARRAY|typeof OBJECT|typeof BASIC {
    if(Array.isArray(thing)) return ARRAY;
    if(thing instanceof Object) return OBJECT;
    return BASIC;
}

export function get<T,K extends keyof T>(thing: T, key: K): T[K] {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    return thing[key];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getIn<T>(thing: T, path: any[]): any {
    return path.reduce((red, key) => get(red, key), thing);
}

export function set<T,K extends keyof T>(thing: T, key: K, value: T[K]): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, key);
    }
    thing[key] = value;
}

export type EachCallback<V,K> = (value: V, key: K) => void;

export function each<T,K extends keyof T>(thing: T, callback: EachCallback<T[K],K>): void {
    const type = getType(thing);
    if(type === BASIC) {
        throw cantAccess(thing, 'any');
    }
    if(type === OBJECT) {
        Object.keys(thing).forEach((key: string) => callback(thing[key as K], key as K));
    }
    if(type === ARRAY) {
        // there must be a better way of telling
        // ts that thing should be treated as array
        const array = thing as unknown;
        (array as Array<T[K]>).forEach((value: T[K], index: unknown) => callback(value, index as K));
    }
}
