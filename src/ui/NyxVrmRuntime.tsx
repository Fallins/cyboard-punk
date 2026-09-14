import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import {
  VRMAnimation,
  VRMAnimationLoaderPlugin,
  VRMLookAtQuaternionProxy,
  createVRMAnimationClip,
} from '@pixiv/three-vrm-animation';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { createEffect, onCleanup, onMount } from 'solid-js';
import {
  NYX_REST_MOTION_ID,
  experimentalVrmCharacterFor,
  nyxProductionVrmMotionFor,
  nyxProductionVrmMotions,
  type NyxRuntimeEvent,
  type NyxRuntimeMotionId,
} from '../experiments/nyxVroidExperiment';
import { SIG_BREATH_EXPERIMENT, sigBreathFrontBackAt } from '../experiments/sigBreath';
import { registerNyxVrmCustomExpressions } from '../experiments/nyxVrmExpressions';
import type { AppLanguage } from '../i18n/core';
import { assessExperimentalVrmCapability, type ExperimentalVrmMotion } from '../experiments/vrmCharacterRuntime';
import type { NyxCameraView } from '../settings/nyxCameraView';
import type { NyxEventMotionMap } from '../settings/settings';
import {
  NYX_RANDOM_MOTION_END_HOLD_MS,
  nextRandomNyxMotion,
  restTransitionProgress,
  shouldKeepNyxRestPoseDuringMotionLoad,
  shouldQueueNyxEventMotion,
  shouldRunNyxRandomAction,
} from './nyxVrmMotion';

interface NyxVrmRuntimeProps {
  readonly characterId: string;
  readonly language: AppLanguage;
  readonly state: NyxRuntimeEvent;
  readonly active: boolean;
  readonly reducedMotion: boolean;
  readonly eventMotions: NyxEventMotionMap;
  readonly randomActionsEnabled: boolean;
  readonly randomActionIntervalSeconds: number;
  readonly characterScale: number;
  readonly cameraLocked: boolean;
  readonly cameraView: NyxCameraView | null;
  readonly cameraResetRequest: number;
  readonly motionPreview: NyxRuntimeMotionId | null;
  readonly motionPreviewRequest: number;
  readonly onCameraViewChange?: (view: NyxCameraView) => void;
  readonly onUnavailable: (reason: string) => void;
}

type ActionKind = 'event' | 'preview' | 'random';

type CurrentAction = {
  readonly action: THREE.AnimationAction;
  readonly kind: ActionKind;
  readonly id: Exclude<NyxRuntimeMotionId, typeof NYX_REST_MOTION_ID>;
};

type BreathBone = {
  readonly node: THREE.Object3D;
  readonly restRotation: THREE.Quaternion;
  readonly multiplier: number;
};

type RawBonePose = {
  readonly node: THREE.Object3D;
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
  readonly scale: THREE.Vector3;
};

type RandomRestTransition = {
  readonly action: THREE.AnimationAction;
  readonly fromPose: readonly RawBonePose[];
  readonly elapsedMs: number | null;
};

const BREATH_BONE_DEFINITIONS = [
  { name: 'spine', multiplier: 0.65 },
  { name: 'chest', multiplier: 1 },
  { name: 'upperChest', multiplier: 1.2 },
] as const;

const DEFAULT_CAMERA_DISTANCE = 4.55;
const DEFAULT_CAMERA_ELEVATION = 0.74;
const CAMERA_VIEW_PRECISION = 100_000;

function isVrm(value: unknown): value is VRM {
  return value instanceof VRM;
}

function firstVrmAnimation(value: unknown): VRMAnimation | null {
  if (!Array.isArray(value)) return null;
  const [animation] = value;
  return animation instanceof VRMAnimation ? animation : null;
}

function hasSourceExpressionTracks(animation: VRMAnimation): boolean {
  return animation.expressionTracks.preset.size + animation.expressionTracks.custom.size > 0;
}

export default function NyxVrmRuntime(props: NyxVrmRuntimeProps) {
  let canvas: HTMLCanvasElement | undefined;
  let renderer: THREE.WebGLRenderer | null = null;
  let vrm: VRM | null = null;
  let modelRoot: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let controls: OrbitControls | null = null;
  let animationFrame: number | null = null;
  let randomTimer: number | null = null;
  let randomRestTransitionTimer: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let previousFrameAt = 0;
  let breathStartedAt = 0;
  let rawModelMinY = 0;
  let rawModelHeight = 0;
  let baseModelScale = 1;
  let disposed = false;
  let unavailable = false;
  let loaded = false;
  let active = props.active;
  let reducedMotion = props.reducedMotion;
  let runtimeState: NyxRuntimeEvent = props.state;
  let previousEventState: NyxRuntimeEvent | null = null;
  let eventMotions = props.eventMotions;
  let randomActionsEnabled = props.randomActionsEnabled;
  let randomActionIntervalSeconds = props.randomActionIntervalSeconds;
  let characterScale = props.characterScale;
  let cameraLocked = props.cameraLocked;
  let cameraView = props.cameraView;
  let lastMotionPreviewRequest = props.motionPreviewRequest;
  let currentAction: CurrentAction | null = null;
  let lastRandomMotionId: Exclude<NyxRuntimeMotionId, typeof NYX_REST_MOTION_ID> | null = null;
  let modelPoseRest: RawBonePose[] = [];
  let randomRestTransition: RandomRestTransition | null = null;
  let pendingMotionPreview: NyxRuntimeMotionId | null = null;
  const breathBones: BreathBone[] = [];
  const breathAxis = new THREE.Vector3(1, 0, 0);
  const breathDelta = new THREE.Quaternion();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
  camera.position.set(0, 1.25, DEFAULT_CAMERA_DISTANCE);
  camera.lookAt(0, 1.18, 0);
  scene.add(new THREE.HemisphereLight(0xd8f6ff, 0x130a26, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
  keyLight.position.set(2, 3, 4);
  const rimLight = new THREE.PointLight(0x8b5cff, 7, 8, 2);
  rimLight.position.set(-2, 1.25, -0.5);
  scene.add(keyLight, rimLight);

  const reportUnavailable = (reason: string) => {
    if (disposed || unavailable) return;
    unavailable = true;
    clearRandomTimer();
    clearRandomRestTransition();
    stopAnimationLoop();
    props.onUnavailable(reason);
  };

  const render = () => renderer?.render(scene, camera);

  const roundedCameraCoordinate = (value: number) => Math.round(value * CAMERA_VIEW_PRECISION) / CAMERA_VIEW_PRECISION;

  const currentCameraView = (): NyxCameraView | null => {
    if (!controls) return null;
    return {
      position: [
        roundedCameraCoordinate(camera.position.x),
        roundedCameraCoordinate(camera.position.y),
        roundedCameraCoordinate(camera.position.z),
      ],
      target: [
        roundedCameraCoordinate(controls.target.x),
        roundedCameraCoordinate(controls.target.y),
        roundedCameraCoordinate(controls.target.z),
      ],
    };
  };

  const publishCameraView = () => {
    if (!loaded) return;
    const view = currentCameraView();
    if (view) props.onCameraViewChange?.(view);
  };

  const applyCameraView = () => {
    if (!controls || !cameraView) return false;
    controls.target.fromArray(cameraView.target);
    camera.position.fromArray(cameraView.position);
    controls.update();
    render();
    return true;
  };

  const clearRandomTimer = () => {
    if (randomTimer === null) return;
    window.clearTimeout(randomTimer);
    randomTimer = null;
  };

  const clearRandomRestTransitionTimer = () => {
    if (randomRestTransitionTimer === null) return;
    window.clearTimeout(randomRestTransitionTimer);
    randomRestTransitionTimer = null;
  };

  const stopAnimationLoop = () => {
    if (animationFrame === null) return;
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  };

  const resetBreathingPose = () => {
    for (const breathBone of breathBones) breathBone.node.quaternion.copy(breathBone.restRotation);
  };

  const resetCameraView = () => {
    if (!controls || rawModelHeight <= 0) return;
    const targetY = rawModelHeight * baseModelScale * characterScale * 0.5;
    controls.target.set(0, targetY, 0);
    camera.position.set(0, targetY + DEFAULT_CAMERA_ELEVATION, DEFAULT_CAMERA_DISTANCE);
    controls.update();
    render();
    publishCameraView();
  };

  const restoreModelPoseRest = () => {
    if (modelPoseRest.length === 0) return;
    if (vrm) vrm.humanoid.autoUpdateHumanBones = false;
    for (const pose of modelPoseRest) {
      pose.node.position.copy(pose.position);
      pose.node.quaternion.copy(pose.quaternion);
      pose.node.scale.copy(pose.scale);
    }
  };

  const captureModelPoseRest = async () => {
    if (!vrm || !mixer) return;
    const motion = nyxProductionVrmMotionFor('modelPose');
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    const gltf = await loader.loadAsync(motion.assetPath);
    if (disposed || !vrm || !mixer) return;
    const animation = firstVrmAnimation(gltf.userData.vrmAnimations);
    if (!animation) throw new Error('NYX model-pose VRMA did not expose a VRMC_vrm_animation track');

    const clip = createVRMAnimationClip(animation, vrm);
    const action = mixer.clipAction(clip);
    vrm.humanoid.autoUpdateHumanBones = true;
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.update(clip.duration);
    vrm.update(0);
    modelPoseRest = Object.values(vrm.humanoid.rawHumanBones)
      .filter((bone): bone is NonNullable<typeof bone> => bone != null)
      .map(({ node }) => ({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      }));
    action.stop();
    mixer.uncacheAction(clip, vrm.scene);
    restoreModelPoseRest();
  };

  const applyRestFace = () => {
    vrm?.expressionManager?.resetValues();
    if (vrm?.expressionManager?.getExpression('relaxed')) vrm.expressionManager.setValue('relaxed', 0.7);
    vrm?.update(0);
  };

  const applyCuratedFace = (motion: ExperimentalVrmMotion, animation: VRMAnimation) => {
    vrm?.expressionManager?.resetValues();
    if (hasSourceExpressionTracks(animation)) {
      vrm?.update(0);
      return;
    }
    const face = motion.face;
    if (face && vrm?.expressionManager?.getExpression(face.expression)) {
      vrm.expressionManager.setValue(face.expression, face.intensity);
    }
    vrm?.update(0);
  };

  const actionIsActive = () => currentAction !== null || randomRestTransition !== null;
  const ambientBreathingEnabled = () => loaded && !reducedMotion && !actionIsActive() && breathBones.length > 0;

  const renderAnimationFrame = (timestamp: number) => {
    animationFrame = window.requestAnimationFrame(renderAnimationFrame);
    if (!active || reducedMotion || document.hidden) return;

    const delta = Math.min((timestamp - previousFrameAt) / 1000, 0.1);
    previousFrameAt = timestamp;
    mixer?.update(delta);
    updateRandomRestTransition(delta * 1000);
    if (ambientBreathingEnabled()) {
      const elapsedSeconds = (timestamp - breathStartedAt) / 1000;
      const sourceValue = sigBreathFrontBackAt(elapsedSeconds);
      for (const breathBone of breathBones) {
        const angleRadians = sourceValue * THREE.MathUtils.degToRad(28) * breathBone.multiplier;
        breathBone.node.quaternion.copy(breathBone.restRotation);
        breathBone.node.quaternion.multiply(breathDelta.setFromAxisAngle(breathAxis, angleRadians));
      }
    }
    vrm?.update(delta);
    render();
  };

  const syncAnimationLoop = () => {
    if (
      !active ||
      reducedMotion ||
      document.hidden ||
      unavailable ||
      (!actionIsActive() && !ambientBreathingEnabled())
    ) {
      stopAnimationLoop();
      return;
    }
    if (animationFrame !== null) return;
    previousFrameAt = performance.now();
    animationFrame = window.requestAnimationFrame(renderAnimationFrame);
  };

  const applyCharacterScale = () => {
    if (!modelRoot) return;
    const scale = baseModelScale * characterScale;
    modelRoot.scale.setScalar(scale);
    modelRoot.position.y = -rawModelMinY * scale;
    if (controls && rawModelHeight > 0) {
      const orbitOffset = camera.position.clone().sub(controls.target);
      controls.target.set(0, rawModelHeight * scale * 0.5, 0);
      camera.position.copy(controls.target).add(orbitOffset);
      controls.update();
    }
    render();
    publishCameraView();
  };

  const captureCurrentHumanPose = (): RawBonePose[] => {
    if (!vrm) return [];
    return Object.values(vrm.humanoid.rawHumanBones)
      .filter((bone): bone is NonNullable<typeof bone> => bone != null)
      .map(({ node }) => ({
        node,
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      }));
  };

  const clearRandomRestTransition = () => {
    clearRandomRestTransitionTimer();
    const transition = randomRestTransition;
    randomRestTransition = null;
    if (transition && vrm) mixer?.uncacheAction(transition.action.getClip(), vrm.scene);
  };

  const beginRandomRestTransition = (action: THREE.AnimationAction) => {
    const fromPose = captureCurrentHumanPose();
    action.enabled = false;
    if (vrm) vrm.humanoid.autoUpdateHumanBones = false;
    currentAction = null;
    randomRestTransition = { action, fromPose, elapsedMs: null };
    randomRestTransitionTimer = window.setTimeout(() => {
      randomRestTransitionTimer = null;
      const transition = randomRestTransition;
      if (disposed || !transition || transition.action !== action) return;
      randomRestTransition = { ...transition, elapsedMs: 0 };
      syncAnimationLoop();
    }, NYX_RANDOM_MOTION_END_HOLD_MS);
    syncAnimationLoop();
  };

  const updateRandomRestTransition = (elapsedFrameMs: number) => {
    const transition = randomRestTransition;
    if (!transition) return;

    const elapsedMs = transition.elapsedMs === null ? null : transition.elapsedMs + elapsedFrameMs;
    const progress = elapsedMs === null ? 0 : restTransitionProgress(elapsedMs);
    for (const fromPose of transition.fromPose) {
      const restPose = modelPoseRest.find((candidate) => candidate.node === fromPose.node);
      if (!restPose) continue;
      fromPose.node.position.lerpVectors(fromPose.position, restPose.position, progress);
      fromPose.node.quaternion.slerpQuaternions(fromPose.quaternion, restPose.quaternion, progress);
      fromPose.node.scale.lerpVectors(fromPose.scale, restPose.scale, progress);
    }

    if (elapsedMs === null || progress < 1) {
      if (elapsedMs !== transition.elapsedMs) randomRestTransition = { ...transition, elapsedMs };
      return;
    }
    randomRestTransition = null;
    if (vrm) mixer?.uncacheAction(transition.action.getClip(), vrm.scene);
    restoreModelPoseRest();
    resetBreathingPose();
    applyRestFace();
    breathStartedAt = performance.now();
    scheduleRandomAction();
  };

  const restoreRestPose = () => {
    clearRandomRestTransition();
    currentAction?.action.stop();
    currentAction = null;
    mixer?.stopAllAction();
    restoreModelPoseRest();
    resetBreathingPose();
    applyRestFace();
    syncAnimationLoop();
    render();
  };

  const scheduleRandomAction = () => {
    clearRandomTimer();
    if (
      !loaded ||
      !shouldRunNyxRandomAction({
        enabled: randomActionsEnabled,
        visible: active && !document.hidden,
        reducedMotion,
        eventActionActive: currentAction?.kind === 'event',
      }) ||
      actionIsActive()
    )
      return;

    randomTimer = window.setTimeout(() => {
      randomTimer = null;
      if (
        !shouldRunNyxRandomAction({
          enabled: randomActionsEnabled,
          visible: active && !document.hidden,
          reducedMotion,
          eventActionActive: currentAction?.kind === 'event',
        }) ||
        actionIsActive()
      ) {
        scheduleRandomAction();
        return;
      }
      const next = nextRandomNyxMotion(
        nyxProductionVrmMotions().map((motion) => motion.id),
        lastRandomMotionId,
      );
      if (next) void playMotion(next, 'random');
    }, randomActionIntervalSeconds * 1000);
  };

  const finishCurrentMotion = () => {
    const finished = currentAction;
    if (!finished) return;
    if (finished.kind === 'random') {
      beginRandomRestTransition(finished.action);
      return;
    }
    finished.action.stop();
    mixer?.uncacheAction(finished.action.getClip(), vrm?.scene);
    currentAction = null;
    restoreRestPose();
    scheduleRandomAction();
  };

  const playMotion = async (id: Exclude<NyxRuntimeMotionId, typeof NYX_REST_MOTION_ID>, kind: ActionKind) => {
    if (!vrm || !mixer || reducedMotion || unavailable) return;
    clearRandomTimer();
    const motion = nyxProductionVrmMotionFor(id);
    const request = ++motionRequest;
    restoreRestPose();
    if (shouldKeepNyxRestPoseDuringMotionLoad(false)) vrm.humanoid.autoUpdateHumanBones = false;

    try {
      const loader = new GLTFLoader();
      loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
      const gltf = await loader.loadAsync(motion.assetPath);
      if (disposed || request !== motionRequest || !vrm || !mixer || reducedMotion) return;
      const animation = firstVrmAnimation(gltf.userData.vrmAnimations);
      if (!animation) throw new Error(`${motion.label} did not expose a VRMC_vrm_animation track`);

      applyCuratedFace(motion, animation);
      const clip = createVRMAnimationClip(animation, vrm);
      const action = mixer.clipAction(clip);
      vrm.humanoid.autoUpdateHumanBones = true;
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.setEffectiveTimeScale(1);
      action.setEffectiveWeight(1);
      action.play();
      mixer.update(0);
      vrm.update(0);
      currentAction = { action, kind, id };
      if (kind === 'random') lastRandomMotionId = id;
      syncAnimationLoop();
      render();
    } catch (error) {
      if (disposed || request !== motionRequest) return;
      restoreRestPose();
      scheduleRandomAction();
      reportUnavailable(error instanceof Error ? `NYX action unavailable: ${error.message}` : 'NYX action unavailable');
    }
  };

  let motionRequest = 0;

  const syncEventMotion = () => {
    if (!loaded) return;
    const nextState = runtimeState;
    const motionId = eventMotions[nextState];
    const shouldQueue = shouldQueueNyxEventMotion(previousEventState, nextState, motionId, reducedMotion);
    previousEventState = nextState;

    if (reducedMotion) {
      clearRandomTimer();
      restoreRestPose();
      return;
    }
    if (shouldQueue) {
      void playMotion(motionId as Exclude<NyxRuntimeMotionId, typeof NYX_REST_MOTION_ID>, 'event');
      return;
    }
    if (motionId === NYX_REST_MOTION_ID && currentAction?.kind === 'random') restoreRestPose();
    scheduleRandomAction();
  };

  const previewChangedMotion = (motionId: NyxRuntimeMotionId) => {
    if (!loaded) {
      pendingMotionPreview = motionId;
      return;
    }
    if (reducedMotion) return;
    if (motionId === NYX_REST_MOTION_ID) {
      restoreRestPose();
      scheduleRandomAction();
      return;
    }
    void playMotion(motionId, 'preview');
  };

  const resize = () => {
    if (!canvas || !renderer) return;
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };

  const prepareBreathing = (loadedVrm: VRM) => {
    breathBones.length = 0;
    for (const definition of BREATH_BONE_DEFINITIONS) {
      const node = loadedVrm.humanoid.getRawBoneNode(definition.name);
      if (!node) continue;
      breathBones.push({
        node,
        restRotation: node.quaternion.clone(),
        multiplier: definition.multiplier,
      });
    }
  };

  const initialise = async () => {
    if (!canvas) return;
    try {
      const character = experimentalVrmCharacterFor(props.characterId);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      controls = new OrbitControls(camera, canvas);
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.enabled = !cameraLocked;
      controls.minDistance = 1.75;
      controls.maxDistance = 8;
      controls.minPolarAngle = THREE.MathUtils.degToRad(28);
      controls.maxPolarAngle = THREE.MathUtils.degToRad(148);
      controls.addEventListener('change', render);
      controls.addEventListener('end', publishCameraView);
      resize();

      const loader = new GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.loadAsync(character.assetPath);
      if (disposed) return;
      if (!isVrm(gltf.userData.vrm)) throw new Error(`${character.label} did not expose VRM runtime metadata`);
      vrm = gltf.userData.vrm;
      if (character.vrmVersion === '0.x') VRMUtils.rotateVRM0(vrm);
      if (character.faceForward === '-Z') vrm.scene.rotation.y += Math.PI;
      registerNyxVrmCustomExpressions(vrm);
      const capability = assessExperimentalVrmCapability({
        hasRawBone: (bone) => vrm?.humanoid.getRawBoneNode(bone as never) != null,
        hasExpression: (expression) => vrm?.expressionManager?.getExpression(expression) != null,
      });
      if (!capability.animationReady) {
        throw new Error(`NYX is missing required humanoid bones: ${capability.missingHumanoidBones.join(', ')}`);
      }
      if (vrm.lookAt) {
        const proxy = new VRMLookAtQuaternionProxy(vrm.lookAt);
        proxy.name = 'NyxVrmLookAtProxy';
        vrm.scene.add(proxy);
      }
      modelRoot = vrm.scene;
      const bounds = new THREE.Box3().setFromObject(modelRoot);
      const size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('NYX has no measurable character height');
      rawModelMinY = bounds.min.y;
      rawModelHeight = size.y;
      baseModelScale = character.targetHeight / size.y;
      scene.add(modelRoot);
      applyCharacterScale();
      mixer = new THREE.AnimationMixer(vrm.scene);
      mixer.addEventListener('finished', (event) => {
        const action = (event as unknown as { readonly action: THREE.AnimationAction }).action;
        if (currentAction?.action === action) finishCurrentMotion();
      });
      await captureModelPoseRest();
      if (disposed || modelPoseRest.length === 0) throw new Error('NYX model-pose rest pose was unavailable');
      if (!applyCameraView()) resetCameraView();
      prepareBreathing(vrm);
      breathStartedAt = performance.now();
      applyRestFace();
      loaded = true;
      publishCameraView();
      previousEventState = null;
      const previewMotion = pendingMotionPreview;
      pendingMotionPreview = null;
      if (previewMotion !== null) {
        previousEventState = runtimeState;
        previewChangedMotion(previewMotion);
      } else {
        syncEventMotion();
      }
      syncAnimationLoop();
      render();
    } catch (error) {
      reportUnavailable(error instanceof Error ? `NYX VRM unavailable: ${error.message}` : 'NYX VRM unavailable');
    }
  };

  onMount(() => {
    const handleContextLoss = (event: Event) => {
      event.preventDefault();
      reportUnavailable('NYX WebGL context was lost');
    };
    canvas?.addEventListener('webglcontextlost', handleContextLoss);
    resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (canvas) resizeObserver?.observe(canvas);
    window.addEventListener('resize', resize);
    void initialise();

    onCleanup(() => {
      disposed = true;
      motionRequest += 1;
      clearRandomTimer();
      clearRandomRestTransition();
      stopAnimationLoop();
      canvas?.removeEventListener('webglcontextlost', handleContextLoss);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      mixer?.stopAllAction();
      controls?.dispose();
      controls = null;
      renderer?.dispose();
      renderer = null;
      mixer = null;
      vrm = null;
      modelRoot = null;
    });
  });

  createEffect(() => {
    runtimeState = props.state;
    eventMotions = props.eventMotions;
    syncEventMotion();
  });

  createEffect(() => {
    const request = props.motionPreviewRequest;
    if (request === lastMotionPreviewRequest) return;
    lastMotionPreviewRequest = request;
    const motion = props.motionPreview;
    if (motion !== null) previewChangedMotion(motion);
  });

  createEffect(() => {
    active = props.active;
    if (!active) clearRandomTimer();
    syncAnimationLoop();
    scheduleRandomAction();
  });

  createEffect(() => {
    const wasReduced = reducedMotion;
    reducedMotion = props.reducedMotion;
    if (reducedMotion && !wasReduced) restoreRestPose();
    syncAnimationLoop();
    scheduleRandomAction();
  });

  createEffect(() => {
    randomActionsEnabled = props.randomActionsEnabled;
    randomActionIntervalSeconds = props.randomActionIntervalSeconds;
    scheduleRandomAction();
  });

  createEffect(() => {
    characterScale = props.characterScale;
    applyCharacterScale();
  });

  createEffect(() => {
    cameraLocked = props.cameraLocked;
    if (controls) controls.enabled = !cameraLocked;
  });

  createEffect(() => {
    cameraView = props.cameraView;
    if (loaded) applyCameraView();
  });

  createEffect(() => {
    props.cameraResetRequest;
    resetCameraView();
  });

  return (
    <div
      class="nyx-vrm-runtime"
      data-nyx-runtime="vrm"
      data-nyx-ambient="sig-breath"
      data-nyx-ambient-duration={SIG_BREATH_EXPERIMENT.durationSeconds}
      data-camera-locked={cameraLocked}
      data-nyx-state={runtimeState}>
      <canvas
        ref={canvas}
        class="nyx-vrm-runtime__canvas"
        aria-label={
          props.language === 'zh-TW'
            ? cameraLocked
              ? 'NYX VRM 角色。視角控制已鎖定。'
              : 'NYX VRM 角色。拖曳可旋轉視角，滾動可縮放。'
            : cameraLocked
              ? 'NYX VRM character. Camera controls are locked.'
              : 'NYX VRM character. Drag to orbit the view and scroll to zoom.'
        }
        tabIndex={0}
      />
    </div>
  );
}
