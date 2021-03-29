import styled from 'styled-components';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {space, textStyle, color, fontSize} from 'styled-system';

export const Text = styled.span`
    ${textStyle}
    ${space}
    ${color}
    ${fontSize}
`;

export const H1 = styled.h1`
    font-size: ${props => props.theme.fontSizes.bigger};
    color: ${props => props.theme.colors.heading};
`;

export const Link = styled.a`
    color: ${props => props.theme.colors.link};
    text-decoration: none;
    font-style: normal;

    &:hover, &:focus {
        color: ${props => props.theme.colors.link};
        text-decoration: underline;
    }

    &:active {
        color: ${props => props.theme.colors.link};
    }
`;
