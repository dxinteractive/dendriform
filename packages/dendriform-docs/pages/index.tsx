
// style

import styled from 'styled-components';
import {space, color, layout, flexbox, position, border, compose, textStyle} from 'styled-system';

const styledProps = compose(
    border,
    color,
    flexbox,
    layout,
    position,
    space,
    textStyle
);

export const Span = styled.span({}, styledProps);

export const Box = styled.div({display: 'block'}, styledProps);

export const Flex = styled.div({display: 'flex'}, styledProps);

export const Fixed = styled.div({position: 'fixed'}, styledProps);

export const Absolute = styled.div({position: 'absolute'}, styledProps);


import React from 'react';

// exciting top component

export default function Main(): React.ReactElement {
    return <Layout>
        hi
    </Layout>;
}

// boring layout, skip this one

interface LayoutProps {
    children: React.ReactElement[]
}

const Layout = (props: LayoutProps): React.ReactElement => {
    return <Box p={3}>
        <h1>dendriform demo</h1>
        <Box mt={3}>
            {props.children}
        </Box>
    </Box>;
};
