interface Nyx2DPrototypeProps {
  onUnavailable?: (reason: string) => void;
}

export const nyx2DPosterPath = '/operator/nyx-2d/poster.webp';

export default function Nyx2DPrototype(props: Nyx2DPrototypeProps) {
  return (
    <div class="nyx-2d-prototype" aria-hidden="true" data-nyx-2d-stage="master">
      <img
        class="nyx-2d-prototype__master"
        src={nyx2DPosterPath}
        alt=""
        draggable={false}
        onError={() => props.onUnavailable?.('NYX 2D master poster unavailable')}
      />
    </div>
  );
}
