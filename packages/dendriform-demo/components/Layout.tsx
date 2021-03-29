import styled from 'styled-components';

import {
    space,
    color,
    layout,
    flexbox,
    border,
    position,
    compose
} from 'styled-system';

import type {Theme} from '../pages/_app';

const styledProps = compose(
    space,
    color,
    layout,
    flexbox,
    border,
    position
);

export const Box = styled.div<any>`
    ${styledProps}
`;

export const Flex = styled.div<any>`
    display: flex;
    ${styledProps}
`;

type WrapperProps = {
    children: React.ReactNode;
    theme: Theme;
    page?: boolean;
};

export const Wrapper = styled(({page, children, ...props}: WrapperProps): React.ReactElement => {
    return <Box {...props}>
        {page ? <Box px={[2,3,4]} pb={5}>{children}</Box> : children}
    </Box>;
})`
    margin: auto;
    max-width: ${(props: WrapperProps) => props.theme.widths.wrapper};
    position: relative;
    ${space}
`;

type FloatZoneProps = {
    children: React.ReactNode[];
    none?: React.ReactNode
};

export const FloatZone = styled(({children, none, ...props}: FloatZoneProps) => { /* eslint-disable-line */
    const items = none && children.length === 0
        ? none
        : children.map((child, key) => <Child key={key} mr={2} mb={2}>{child}</Child>);

    return <Box {...props}>{items}</Box>;
})`
    &:after {
        content: "";
        clear: both;
        display: table;
    }
`;

const Child = styled(Box)`
    float: left;
`;
