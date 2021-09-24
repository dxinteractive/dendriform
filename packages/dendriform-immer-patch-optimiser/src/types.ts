export type Key = number|string;
export type Path = Key[];

export type DendriformPatch = {
    namespace?: string;
    op: string,
    path: Path;
    from?: Path;
    to?: Path;
    value?: unknown;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// export type DendriformPatchDef<P extends readonly any[], V> = V extends Record<string, any> ? {
//     [K in keyof V]: DendriformPatchDef<[...P, K], V[K]>
// }[keyof V] : {
//     op: 'add'|'replace'|'remove'|'move';
//     path: P;
//     from?: P;
//     value?: V;
// };
// export type DendriformPatchWithValue<V> = DendriformPatchDef<[], V>;

export type DendriformPatchWithValue<V> = {
    [K in keyof V]: {
        namespace?: string;
        op: string;
        path: [K];
        from?: [K];
        to?: [K];
        value?: V[K];
    } | {
        namespace?: string;
        op: string;
        path: [K, ...unknown[]];
        from?: [K, ...unknown[]];
        to?: [K, ...unknown[]];
        value?: unknown;
    } | {
        namespace?: string;
        op: string;
        path: [];
        value?: V;
    }
}[keyof V];
