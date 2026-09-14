import { Show } from 'solid-js';

export interface NyxSpeechBubbleMessage {
  readonly id: string;
  readonly text: string;
}

export default function NyxSpeechBubble(props: { message?: NyxSpeechBubbleMessage | null }) {
  return (
    <Show when={props.message} keyed>
      {(message) => (
        <aside class="nyx-speech-bubble" data-message-id={message.id} role="status" aria-live="polite" aria-atomic="true">
          <span class="nyx-speech-bubble__speaker">NYX</span>
          <strong>{message.text}</strong>
        </aside>
      )}
    </Show>
  );
}
