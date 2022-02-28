// const all = `can only be called on forms containing an array, object, es6 map or es6 set`;

const errors = {
    0: (id: number) => `Cannot find path of node ${id}`,
    // 1: (path: unknown[]) => `Cannot find node at path ${path.map(a => JSON.stringify(a)).join('","')}`,
    // 2: `branchAll() ${all}`,
    // 3: `renderAll() ${all}`,
    4: (path: unknown[]) => `useIndex() can only be called on array element forms, can't be called at path ${path.map(a => JSON.stringify(a)).join('","')}`,
    5: `sync() forms must have the same maximum number of history items configured`,
    6: (msg: string) => `onDerive() callback must not throw errors on first call. Threw: ${msg}`,
    7: `Cannot call .set() on an element of an es6 Set`,
    8: `Plugin must be passed into a Dendriform instance before this operation can be called`,
    9: `Cannot call .set() or .go() on a readonly form`
} as const;

export type ErrorKey = keyof typeof errors;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function die(error: ErrorKey, ...args: any[]): never {
    if(__DEV__) {
        const e = errors[error];
        const msg = !e
            ? `unknown error #${error}`
            : typeof e === 'function'
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                ? e(args)
                : e;

        throw new Error(`[Dendriform] ${msg}`);
    }
    throw new Error(
        `[Dendriform] minified error #${error}: ${args.length ? args.map(a => JSON.stringify(a)).join(', ') : ''}`
    );
}
