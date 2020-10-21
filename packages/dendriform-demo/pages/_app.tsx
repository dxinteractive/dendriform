import {AppProps} from 'next/app';
import '../styles.css';

export default function App({Component, pageProps}: AppProps): React.ReactElement {
    return <Component {...pageProps} />;
}
