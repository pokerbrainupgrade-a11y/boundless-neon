import { render } from 'preact';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

render(<App />, document.getElementById('app')!);
