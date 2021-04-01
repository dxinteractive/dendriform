
import styled from 'styled-components';
import {Box, Flex, Wrapper, FloatZone} from '../components/Layout';
import {Text, H1, Link} from '../components/Text';
import {Demos} from '../components/Demos';
import type {ThemeProps} from '../pages/_app';

export default function Main(): React.ReactElement {
    return <Wrapper page>
        <Flex alignItems="center" mt={4} mb={4}>
            <Box mr={4} width="5rem" pt={2}>
                <img alt="Dendriform logo" src="/logo-dendriform.png" width="100%" />
            </Box>
            <Box maxWidth="20rem">
                <Logo>dendriform</Logo>
                <Text as="div" color="subtitle" style={{fontStyle: "italic", lineHeight: '1.3rem'}}>Build feature-rich data-editing React UIs with great performance and not much code.</Text>
            </Box>
        </Flex>
        <FloatZone>
            <Badge src="https://img.shields.io/npm/v/dendriform.svg" to="https://www.npmjs.com/package/dendriform">NPM</Badge>
            <Badge src="https://github.com/92green/dendriform/workflows/CI/badge.svg?branch=master">CI: Build Status</Badge>
            <Badge src="https://img.shields.io/badge/Maturity-Early%20days-yellow">Maturity: Early Days</Badge>
            <Badge src="https://img.shields.io/badge/Coolness-Reasonable-blue">Coolness Reasonable</Badge>
        </FloatZone>
        <Box my={5}>
            <Text fontSize="big">Looking for the docs or source code? <Link href="https://github.com/92green/dendriform">Go to the github repo.</Link></Text>
        </Box>
        <Hr />
        <Box mb={3}>
            <H1>Demos</H1>
        </Box>
        <Box mb={3}>
            <Demos />
        </Box>
    </Wrapper>;
}

const Logo = styled(Box)`
    font-size: 2.5rem;
    line-height: 2rem;
    margin-bottom: .5rem;
    color: ${(props: ThemeProps) => props.theme.colors.heading};
`;

const Hr = styled.div`
    border-bottom: 1px solid ${(props: ThemeProps) => props.theme.colors.line};
    margin: 2rem 0;
`;

type BadgeProps = {
    children: string;
    src: string;
    to?: string;
};

const Badge = styled((props: BadgeProps): React.ReactElement => {
    const {src, children = '', to} = props;
    const img = <img src={src} alt={children} title={children} />;
    return to ? <a href={to}>{img}</a> : img;
})`
    img {
        display: block;
    }
`;
