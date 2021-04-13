import {AppProps} from 'next/app';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {ThemeProvider, createGlobalStyle} from 'styled-components';

const GlobalStyle = createGlobalStyle`
    html, body, div, span, applet, object, iframe,
    h1, h2, h3, h4, h5, h6, p, blockquote, pre,
    a, abbr, acronym, address, big, cite, code,
    del, dfn, em, img, ins, kbd, q, s, samp,
    small, strike, strong, sub, sup, tt, var,
    b, u, i, center,
    dl, dt, dd, ol, ul, li,
    fieldset, form, label, legend,
    table, caption, tbody, tfoot, thead, tr, th, td,
    article, aside, canvas, details, embed,
    figure, figcaption, footer, header, hgroup,
    menu, nav, output, ruby, section, summary,
    time, mark, audio, video {
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 100%;
        font: inherit;
        vertical-align: baseline;
    }
    article, aside, details, figcaption, figure,
    footer, header, hgroup, menu, nav, section {
        display: block;
    }
    body {
        line-height: 1;
    }
    ol, ul {
        list-style: none;
    }
    blockquote, q {
        quotes: none;
    }
    blockquote:before, blockquote:after,
    q:before, q:after {
        content: '';
        content: none;
    }
    table {
        border-collapse: collapse;
        border-spacing: 0;
    }
    * {
        box-sizing: border-box;
    }

    html {
        font-family: 'Nunito', sans-serif;
        height: 100%;
        line-height: 1.5em;
        position: relative;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-color: ${(props: ThemeProps) => props.theme.colors.background};
        color: ${(props: ThemeProps) => props.theme.colors.text};

        font-size: 16px;

        @media all and (min-width: 699px) {
            font-size: 18px;
        }
    }

    body {
        font-weight: 400;
        height: 100%;
        line-height: 1.2em;
        overflow-x: hidden;
        text-rendering: optimizelegibility;

        &[aria-hidden='true'] {
            overflow: hidden;
        }
    }

    #root {
        height: 100%;
    }
`;

const fonts = {
    mono: `'DM Mono', sans-serif`,
    copy: `'Nunito', sans-serif`
};

const fontSizes = {
    smaller: '.8rem',
    small: '.9rem',
    big: '1.2rem',
    bigger: '1.5rem'
};

const widths = {
    wrapper: '7000px'
};

const colors = {
    subtitle: '#4f81a9',
    text: '#6490b3',
    code: '#a5c5de',
    heading: '#ffffff',
    link: 'rgb(241 67 44)',
    line: '#1e2c37',
    background: '#0e151b',
    backgroundLight: 'rgb(24 35 45)'
};

export type Theme = {
    fonts: {
        mono: string;
        copy: string;
    };
    widths: {
        wrapper: string;
    };
    colors: {
        subtitle: string;
        text: string;
        code: string;
        heading: string;
        link: string;
        line: string;
        background: string;
        backgroundLight: string;
    };
    fontSizes: {
        smaller: string;
        small: string;
        big: string;
        bigger: string;
    };
};

export type ThemeProps = {
    theme: Theme;
};

const theme: Theme = {
    fonts,
    fontSizes,
    widths,
    colors
};

export default function App({Component, pageProps}: AppProps): React.ReactElement {
    return <>
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400&display=swap" rel="stylesheet" />
        <ThemeProvider theme={theme}>
            <GlobalStyle />
            <Component {...pageProps} />
        </ThemeProvider>
    </>;
}
