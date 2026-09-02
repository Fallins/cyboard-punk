import './nyx2d.css';

interface Nyx2DPrototypeProps {
  onUnavailable?: (reason: string) => void;
}

// Static fidelity uses the canonical approved NYX master directly through
// Vite's asset graph. This avoids relying on generated public/ files in dev
// and gives production builds a fingerprinted asset URL automatically.
export const nyx2DPosterPath = new URL(
  '../../assets/operator/nyx/source/master.webp',
  import.meta.url,
).href;

export default function Nyx2DPrototype(props: Nyx2DPrototypeProps) {
  return (
    <div class="nyx-2d-prototype" aria-hidden="true" data-nyx-2d-stage="master">
      <img
        class="nyx-2d-prototype__master"
        src={nyx2DPosterPath}
        alt=""
        draggable={false}
        onError={() => props.onUnavailable?.(`NYX 2D master poster unavailable: ${nyx2DPosterPath}`)}
      />
    </div>
  );
}
