import { render } from 'preact';
import '@fontsource/bungee/latin-400.css';
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-600.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './app';
import { registerSW } from 'virtual:pwa-register';
import { boot } from './lib/store';

registerSW({ immediate: true });

render(<App />, document.getElementById('app')!);
void boot();

// Test/debug hook (no personal data; on-device only).
import { db } from './lib/db';
import { updateSettings, settings } from './lib/settings';
import { startBlock, reloadBlocks, reloadLogs } from './lib/store';
(window as unknown as { __bneon: unknown }).__bneon = { db, updateSettings, settings, startBlock, reloadBlocks, reloadLogs };
