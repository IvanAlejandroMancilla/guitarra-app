/** Escena Three.js: renderer, niebla, luces y registro de capas. */
import { AmbientLight, Color, DirectionalLight, Fog, Scene, WebGLRenderer, type Camera } from 'three';
import { V3D_COLOR_FONDO, V3D_LARGO_AUTOPISTA } from './v3d_constantes';
import type { IV3dCapa, IV3dPerfilCalidad } from './v3d_tipos';

export class V3dEscena {
  readonly #renderer: WebGLRenderer;
  readonly #escena = new Scene();
  readonly #capas: IV3dCapa[] = [];
  readonly #perfil: IV3dPerfilCalidad;
  #anchoPx = 0;
  #altoPx = 0;

  constructor(lienzo: HTMLCanvasElement, perfil: IV3dPerfilCalidad) {
    this.#perfil = perfil;
    this.#renderer = new WebGLRenderer({
      canvas: lienzo,
      antialias: perfil.tieneAntialias,
      powerPreference: 'high-performance',
    });
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, perfil.pixelRatioMax));
    this.#renderer.setClearColor(V3D_COLOR_FONDO, 1);
    this.#renderer.shadowMap.enabled = perfil.tieneSombras;

    this.#escena.background = new Color(V3D_COLOR_FONDO);
    this.#escena.fog = new Fog(V3D_COLOR_FONDO, V3D_LARGO_AUTOPISTA * 0.45, V3D_LARGO_AUTOPISTA * 1.05);

    this.#escena.add(new AmbientLight('#c8d4ff', 1.1));
    const luz = new DirectionalLight('#ffffff', 1.6);
    luz.position.set(3, 10, 6);
    luz.target.position.set(0, 0, -V3D_LARGO_AUTOPISTA * 0.3);
    if (perfil.tieneSombras) {
      luz.castShadow = true;
      luz.shadow.mapSize.set(1024, 1024);
      const camSombra = luz.shadow.camera;
      camSombra.left = -8;
      camSombra.right = 8;
      camSombra.top = 30;
      camSombra.bottom = -30;
      camSombra.near = 1;
      camSombra.far = 80;
    }
    this.#escena.add(luz, luz.target);
  }

  agregar(capa: IV3dCapa): void {
    this.#capas.push(capa);
    this.#escena.add(capa.objeto);
  }

  dibujar(camara: Camera): void {
    if (this.#anchoPx <= 0 || this.#altoPx <= 0) return;
    this.#renderer.render(this.#escena, camara);
  }

  redimensionar(anchoPx: number, altoPx: number): void {
    this.#anchoPx = Math.max(0, Math.floor(anchoPx));
    this.#altoPx = Math.max(0, Math.floor(altoPx));
    if (this.#anchoPx === 0 || this.#altoPx === 0) return;
    // El devicePixelRatio puede cambiar al mover la ventana entre monitores.
    this.#renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, this.#perfil.pixelRatioMax));
    // `false`: el tamaño CSS lo maneja el contenedor (canvas al 100 %).
    this.#renderer.setSize(this.#anchoPx, this.#altoPx, false);
  }

  /** Libera todas las capas y el contexto WebGL. La instancia no se puede reutilizar. */
  liberar(): void {
    for (const capa of this.#capas) {
      this.#escena.remove(capa.objeto);
      capa.liberar();
    }
    this.#capas.length = 0;
    this.#escena.clear();
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
  }
}
