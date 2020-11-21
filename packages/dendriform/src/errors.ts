const errors = {
    0: (id: number) => `Cannot find path of node ${id}`,
    1: (path: unknown[]) => `Cannot find node at path ${path.map(a => JSON.stringify(a)).join('","')}`,
    2: 'branchAll() can only be called on forms containing arrays',
    3: 'renderAll() can only be called on forms containing arrays'
} as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function die(error: keyof typeof errors, ...args: any[]): never {
    if(__DEV__) {
        const e = errors[error];
        const msg = !e
            ? `unknown error #${error}`
            : typeof e === 'function'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? e(args as any)
                : e;

        throw new Error(`[Dendriform] ${msg}`);
    }
    throw new Error(
        `[Dendriform] minified error #${error}: ${args.length ? args.map(a => JSON.stringify(a)).join(', ') : ''}`
    );
}
