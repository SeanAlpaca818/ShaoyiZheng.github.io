import { OceanEngine } from './src/engine';

const canvas = document.querySelector<HTMLCanvasElement>('#home-koi');
if (canvas) {
  const engine = new OceanEngine(canvas);
  window.addEventListener('pagehide', (event) => {
    // Keep the engine intact when Back/Forward restores this cached document.
    if (!event.persisted) engine.destroy();
  });
}
