import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { render } from 'solid-js/web';
import { resolveAppSurface } from './runtime/surface';
import App from './ui/App';
import CompactApp from './ui/CompactApp';
import './ui/styles.css';
import './ui/accessibility.css';
import './ui/compact.css';
import './ui/trend.css';
import './ui/density.css';

const isTauriRuntime = '__TAURI_INTERNALS__' in window;
const windowLabel = isTauriRuntime ? getCurrentWebviewWindow().label : undefined;
const Root = resolveAppSurface(isTauriRuntime, windowLabel) === 'compact' ? CompactApp : App;

render(() => <Root />, document.getElementById('root')!);
