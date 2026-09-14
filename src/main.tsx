import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { render } from 'solid-js/web';
import { resolveAppSurface } from './runtime/surface';
import App from './ui/App';
import CompactApp from './ui/CompactApp';
import NyxPresence from './ui/NyxPresence';
import './ui/styles.css';
import './ui/accessibility.css';
import './ui/compact.css';
import './ui/trend.css';
import './ui/usage.css';
import './ui/operator-brief.css';
import './ui/session-closeouts.css';
import './ui/density.css';
import './ui/polish.css';
import './ui/readability.css';

const isTauriRuntime = '__TAURI_INTERNALS__' in window;
const windowLabel = isTauriRuntime ? getCurrentWebviewWindow().label : undefined;
const surface = resolveAppSurface(isTauriRuntime, windowLabel);
const Root = surface === 'compact' ? CompactApp : surface === 'nyx-presence' ? NyxPresence : App;

render(() => <Root />, document.getElementById('root')!);
