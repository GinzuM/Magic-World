let lastTime = performance.now();
export let timeScale = 1.0;

export function gameLoop(timestamp, updateCallback, renderCallback) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;
  
  updateCallback(deltaTime, timeScale);
  renderCallback();
  
  requestAnimationFrame((ts) => gameLoop(ts, updateCallback, renderCallback));
}
