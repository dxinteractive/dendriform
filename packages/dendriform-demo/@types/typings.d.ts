declare module "*.graphql" {
    const value: string;
    export default value;
}

declare module "styled-system" {
    const space: any;
    const color: any;
    const layout: any;
    const flexbox: any;
    const position: any;
    const border: any;
    const compose: any;
    const textStyle: any;
    export {space, color, layout, flexbox, position, border, compose, textStyle};
}

declare module "styled-components" {
    const value: any;
    export default value;
}

declare module 'shallow-equal' {
    const shallowEqualArrays: (array1: unknown[], array2: unknown[]) => boolean;
    export {shallowEqualArrays};
}
