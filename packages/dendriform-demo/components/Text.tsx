import styled from 'styled-components';
import {space, textStyle, color, fontSize} from 'styled-system';
import type {ThemeProps} from '../pages/_app';

export const Text = styled.span`
    ${textStyle}
    ${space}
    ${color}
    ${fontSize}
`;

export const H1 = styled.h1`
    font-size: ${(props: ThemeProps) => props.theme.fontSizes.bigger};
    color: ${(props: ThemeProps) => props.theme.colors.heading};
    line-height: 1.4em;
`;

export const H2 = styled.h2`
    font-size: ${(props: ThemeProps) => props.theme.fontSizes.big};
    color: ${(props: ThemeProps) => props.theme.colors.heading};
    line-height: 1.4em;
`;

export const Link = styled.a`
    color: ${(props: ThemeProps) => props.theme.colors.link};
    text-decoration: none;
    font-style: normal;
    cursor: pointer;

    &:hover, &:focus {
        color: ${(props: ThemeProps) => props.theme.colors.link};
        text-decoration: underline;
    }

    &:active {
        color: ${(props: ThemeProps) => props.theme.colors.link};
    }
`;
