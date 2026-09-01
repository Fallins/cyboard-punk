import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { render } from 'solid-js/web';
import App from './ui/App';
import CompactApp from './ui/CompactApp';
import './ui/styles.css';
import './ui/compact.css';
import './ui/trend.css';

const isTauriRuntime = '__TAURI_INTERNALS__' in window;
const isCompactSurface = isTauriRuntime && getCurrentWebviewWindow().label === 'compact';
const Root = isCompactSurface ? CompactApp : App;

render(() => <Root />, document.getElementById('root')!);
