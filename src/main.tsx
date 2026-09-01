import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { render } from 'solid-js/web';
import App from './ui/App';
import CompactApp from './ui/CompactApp';
import './ui/styles.css';

const currentWindow = getCurrentWebviewWindow();
const Root = currentWindow.label === 'compact' ? CompactApp : App;

render(() => <Root />, document.getElementById('root')!);
