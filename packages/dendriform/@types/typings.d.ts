declare module 'shallow-equal' {
    const shallowEqualArrays: (array1: unknown[], array2: unknown[]) => boolean;
    export {shallowEqualArrays};
}

declare var __DEV__: boolean;
