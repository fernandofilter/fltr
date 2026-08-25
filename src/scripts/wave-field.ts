/**
 * The point-wave field.
 *
 * Built as the technique, not an imitation of it: a real WebGL point mesh whose
 * vertices are displaced in the vertex shader. Two rules from the visual world
 * govern the implementation and are easy to break by accident:
 *
 *  1. NO GREY. Points are the signal value or not drawn. Depth is carried by
 *     point SIZE, never by an opacity fade — an alpha ramp between the world's
 *     two values is a grey token wearing a different name. The only alpha in
 *     the fragment shader is a half-pixel edge feather: antialiasing, not tone.
 *     Both values arrive from the theme, so light mode is the same rule read
 *     the other way round, not a second material.
 *
 *  2. The readout is REAL. The values printed on the rails are sampled from
 *     this mesh on the frame they are shown. They are measurements of the thing
 *     on screen, not invented business metrics.
 *
 * three is imported by NAME, statically. This module is itself only ever
 * reached through a dynamic import from the island, so the deferral is intact —
 * but static named imports let the bundler drop everything three ships that
 * this field never touches. `await import('three')` inside the function would
 * pull the whole namespace and defeat that.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';

export interface Readout {
  amplitude: number;
  nodes: number;
  frame: number;
}

export interface FieldHandle {
  setRunning(running: boolean): void;
  isRunning(): boolean;
  setTheme(theme: Theme): void;
  /**
   * Let the entrance play. While held, the mesh renders as the flat plane it
   * starts from — which is what the boot screen is covering — so the one
   * authored beat on this page is spent on a visitor who can see it rather
   * than behind a curtain. A no-op once released, and under reduced motion,
   * where there is no entrance to hold.
   */
  releaseEntrance(): void;
  destroy(): void;
}

/** Boot stages the field can vouch for. The boot screen prints these. */
export type BootStage = 'renderer' | 'mesh' | 'frame';

const VERT = /* glsl */ `
  uniform vec3 uPhase;
  uniform float uProgress;
  uniform float uPointScale;

  void main() {
    vec3 p = position;

    // Three harmonics, deliberately incommensurate so the field never visibly
    // repeats. uProgress runs 0..1 once on entrance: the mesh resolves out of a
    // flat plane. That is the page's single authored motion beat.
    //
    // The phases arrive ALREADY REDUCED to [0, 2π), computed on the CPU in
    // double precision. Passing raw elapsed seconds instead — as this did —
    // means a page left open overnight hands the shader numbers in the tens of
    // thousands, where a 32-bit float's spacing grows past the per-frame
    // increment and the wave visibly quantises. sin() is periodic, so folding
    // the phase costs nothing and the motion is identical.
    float w =
        sin(p.x * 0.085 + uPhase.x) * 2.60
      + sin(p.z * 0.115 - uPhase.y) * 1.85
      + sin((p.x + p.z) * 0.052 + uPhase.z) * 2.15;

    p.y = w * uProgress;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Recession by SIZE, and by size alone. The floor keeps the far field a
    // crisp fine grain instead of letting it fall under a pixel and dissolve;
    // beyond that distance depth is carried by the near and mid bands.
    float dist = -mv.z;
    float size = uPointScale * (58.0 / max(dist, 1.0));

    // Crests read slightly heavier than troughs, so the wave has a light side
    // without introducing a second value.
    size *= 0.82 + 0.30 * smoothstep(-3.0, 3.5, p.y);

    gl_PointSize = clamp(size, 0.95, 6.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uSignal;

  void main() {
    // Round point with a half-pixel feather. This is antialiasing, not tone:
    // the interior is the signal value at full alpha, and nothing anywhere in
    // this shader scales that down. An alpha ramp between the two values IS
    // grey, and this world has no grey — recession happens in gl_PointSize.
    vec2 c = gl_PointCoord - vec2(0.5);
    float a = 1.0 - smoothstep(0.42, 0.5, length(c));
    if (a <= 0.01) discard;
    gl_FragColor = vec4(uSignal, a);
  }
`;

/**
 * The field's two values, matching the CSS tokens exactly. The canvas paints
 * its own ground, so a stylesheet cannot reach it: the theme has to be handed
 * across explicitly or the mesh stays black behind a white page.
 */
export type Theme = 'dark' | 'light';

const PALETTE: Record<Theme, { ground: number; signal: [number, number, number] }> = {
  dark: { ground: 0x000000, signal: [1, 1, 1] },
  light: { ground: 0xffffff, signal: [0, 0, 0] },
};

/**
 * Grid density scales with viewport: narrow screens thin the mesh rather than
 * shrinking it, per the brief. Point scale rises as density falls so a phone
 * still gets a field with presence instead of a haze.
 */
function densityFor(width: number): { cols: number; rows: number; scale: number } {
  if (width < 560) return { cols: 172, rows: 148, scale: 1.35 };
  if (width < 1024) return { cols: 180, rows: 130, scale: 1.25 };
  if (width < 1600) return { cols: 240, rows: 156, scale: 1.05 };
  return { cols: 288, rows: 180, scale: 1.0 };
}

/**
 * Framing. A phone is portrait, so the same camera that composes a desktop
 * horizon leaves a portrait frame mostly empty: pull the view down and widen it
 * so the ridge spans the frame in both orientations.
 */
function framingFor(aspect: number) {
  const portrait = aspect < 1;
  // Portrait keeps a clear angle of incidence on purpose. Dropping the eye
  // toward the field plane to fill the tall frame looks like the obvious fix
  // and is not: at a grazing angle the regular grid undersamples against the
  // wave period and the mesh breaks into moiré arcs. Height buys sampling.
  return {
    fov: portrait ? 72 : 52,
    position: portrait ? ([0, 10.5, 44] as const) : ([0, 15.5, 62] as const),
    target: portrait ? ([0, -1.5, -16] as const) : ([0, -2.5, -22] as const),
  };
}

export async function initWaveField(
  canvas: HTMLCanvasElement,
  opts: {
    onReadout?: (r: Readout) => void;
    onBoot?: (stage: BootStage, value: string) => void;
    startRunning: boolean;
    holdEntrance?: boolean;
    theme: Theme;
  }
): Promise<FieldHandle | null> {
  const bootStart = performance.now();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
  } catch {
    return null; // No WebGL. The caller ships the static fallback.
  }

  // Which context was actually handed over, not which one was asked for.
  opts.onBoot?.(
    'renderer',
    typeof WebGL2RenderingContext !== 'undefined' &&
      renderer.getContext() instanceof WebGL2RenderingContext
      ? 'WebGL2'
      : 'WebGL'
  );

  const scene = new Scene();
  scene.background = new Color(PALETTE[opts.theme].ground);

  const camera = new PerspectiveCamera(
    52,
    canvas.clientWidth / Math.max(canvas.clientHeight, 1),
    0.1,
    400
  );

  const FIELD_W = 190;
  const FIELD_D = 190;

  let nodes = 0;

  function buildGrid(width: number) {
    const { cols, rows } = densityFor(width);
    const positions = new Float32Array(cols * rows * 3);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[i++] = (c / (cols - 1) - 0.5) * FIELD_W;
        positions[i++] = 0;
        positions[i++] = (r / (rows - 1) - 0.5) * FIELD_D;
      }
    }
    nodes = cols * rows;
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(positions, 3));
    return g;
  }

  const geometry = buildGrid(window.innerWidth);
  opts.onBoot?.('mesh', nodes.toLocaleString('en-US'));

  const material = new ShaderMaterial({
    uniforms: {
      uPhase: { value: new Vector3() },
      uProgress: { value: 0 },
      uPointScale: { value: densityFor(window.innerWidth).scale },
      uSignal: { value: new Vector3(...PALETTE[opts.theme].signal) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });

  const points = new Points(geometry, material);
  scene.add(points);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    // Low angle across the field, so the mesh reads as terrain crossing a
    // horizon rather than a plane seen from above.
    const aspect = w / h;
    const framing = framingFor(aspect);
    camera.aspect = aspect;
    camera.fov = framing.fov;
    camera.position.set(...framing.position);
    camera.lookAt(...framing.target);
    camera.updateProjectionMatrix();

    const next = densityFor(w);
    material.uniforms.uPointScale.value = next.scale;
    const { cols, rows } = next;
    if (cols * rows !== nodes) {
      const old = points.geometry;
      points.geometry = buildGrid(w);
      old.dispose();
    }
  }

  /**
   * The three temporal rates the wave steps its harmonics with. The readout
   * below samples the same numbers, so what the rails print and what the shader
   * draws cannot drift apart.
   */
  const RATE = [0.55, 0.38, 0.24] as const;
  const TAU = Math.PI * 2;

  /** Seconds in, phase folded to one turn out. Done here, in double precision. */
  function setPhase(seconds: number) {
    (material.uniforms.uPhase.value as Vector3).set(
      (seconds * RATE[0]) % TAU,
      (seconds * RATE[1]) % TAU,
      (seconds * RATE[2]) % TAU
    );
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let running = opts.startRunning && !reduceMotion.matches;
  // Nothing to hold under reduced motion: the entrance does not play there, the
  // mesh is simply already resolved.
  let held = Boolean(opts.holdEntrance) && !reduceMotion.matches;
  let raf = 0;
  let frame = 0;
  let clockStart = performance.now();
  let elapsed = 0;
  let entranceStart = 0;

  function readAmplitude(t: number): number {
    // Sample the same harmonic sum the shader evaluates, at a fixed lattice of
    // probe points. This is the field's own value, not a decorative number.
    let peak = 0;
    for (let i = 0; i < 24; i++) {
      const x = ((i % 6) / 5 - 0.5) * FIELD_W;
      const z = (Math.floor(i / 6) / 3 - 0.5) * FIELD_D;
      const w =
        Math.sin(x * 0.085 + t * RATE[0]) * 2.6 +
        Math.sin(z * 0.115 - t * RATE[1]) * 1.85 +
        Math.sin((x + z) * 0.052 + t * RATE[2]) * 2.15;
      peak = Math.max(peak, Math.abs(w));
    }
    return peak * (material.uniforms.uProgress.value as number);
  }

  function draw(now: number) {
    if (running) elapsed = (now - clockStart) / 1000;
    setPhase(elapsed);

    // Entrance: exponential ease-out from a flat, already-visible plane.
    // While held it stays at the flat plane — the field is running, measurable
    // and reporting; it just has not made its entrance yet.
    let p = 0;
    if (held) {
      material.uniforms.uProgress.value = 0;
    } else {
      if (entranceStart === 0) entranceStart = now;
      p = Math.min((now - entranceStart) / 1400, 1);
      material.uniforms.uProgress.value = reduceMotion.matches ? 1 : 1 - Math.pow(1 - p, 4);
    }

    renderer.render(scene, camera);
    if (frame === 0) {
      opts.onBoot?.('frame', `${Math.round(performance.now() - bootStart)} ms`);
    }
    frame++;

    if (opts.onReadout && frame % 6 === 0) {
      opts.onReadout({ amplitude: readAmplitude(elapsed), nodes, frame });
    }

    if (running || (!held && p < 1)) raf = requestAnimationFrame(draw);
    else raf = 0;
  }

  function kick() {
    if (!raf) {
      clockStart = performance.now() - elapsed * 1000;
      raf = requestAnimationFrame(draw);
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Reduced motion holds a single high-contrast still — the field is present,
  // fully resolved, and does not move.
  if (reduceMotion.matches) {
    material.uniforms.uProgress.value = 1;
    setPhase(0);
    renderer.render(scene, camera);
    // draw() never runs on this path, so the frame stage reports from here or
    // the boot screen would wait on a stage that is already done.
    opts.onBoot?.('frame', `${Math.round(performance.now() - bootStart)} ms`);
    opts.onReadout?.({ amplitude: readAmplitude(0), nodes, frame: 0 });
  } else {
    kick();
  }

  const onMotionPrefChange = () => {
    if (reduceMotion.matches) {
      running = false;
      material.uniforms.uProgress.value = 1;
      renderer.render(scene, camera);
    }
  };
  reduceMotion.addEventListener('change', onMotionPrefChange);

  // A hidden tab paints nothing; keep it off the GPU.
  const onVisibility = () => {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    } else if (running) kick();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setRunning(next: boolean) {
      running = next && !reduceMotion.matches;
      if (running) kick();
    },
    isRunning: () => running,

    releaseEntrance() {
      if (!held) return;
      held = false;
      // Stamped by draw() on its next frame, so the ease starts from the moment
      // the curtain actually moves rather than from whenever the field booted.
      entranceStart = 0;
      kick();
    },

    setTheme(theme: Theme) {
      const next = PALETTE[theme];
      (scene.background as Color).setHex(next.ground);
      (material.uniforms.uSignal.value as Vector3).set(...next.signal);
      // Paint immediately. A held field — reduced motion, or the stop control
      // pressed — has no frame coming, and would otherwise sit in the old
      // theme until something unrelated woke the loop.
      renderer.render(scene, camera);
    },
    destroy() {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduceMotion.removeEventListener('change', onMotionPrefChange);
      points.geometry.dispose();
      material.dispose();
      renderer.dispose();
    },
  };
}
