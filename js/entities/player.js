export const player = {
  x: 1.5,
  y: 1.5,
  angle: 0,
  speed: 0.0525,
  rotSpeed: 2.1,
  friction: 0.8,
  acceleration: 0.015
};

const keys = {};

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function updatePlayer(deltaTime, timeScale, currentMap) {
  const timeMultiplier = (deltaTime / 16) * timeScale;
  const accel = player.acceleration * timeMultiplier;
  const rot = player.rotSpeed * timeMultiplier;

  let dx = 0;
  let dy = 0;

  if (keys['w']) { dx += Math.cos(degToRad(player.angle)) * accel; dy += Math.sin(degToRad(player.angle)) * accel; }
  if (keys['s']) { dx -= Math.cos(degToRad(player.angle)) * accel; dy -= Math.sin(degToRad(player.angle)) * accel; }
  if (keys['a']) { dx += Math.cos(degToRad(player.angle - 90)) * accel; dy += Math.sin(degToRad(player.angle - 90)) * accel; }
  if (keys['d']) { dx += Math.cos(degToRad(player.angle + 90)) * accel; dy += Math.sin(degToRad(player.angle + 90)) * accel; }
  
  if (keys['arrowleft']) player.angle = (player.angle - rot + 360) % 360;
  if (keys['arrowright']) player.angle = (player.angle + rot) % 360;

  const newX = player.x + dx;
  const newY = player.y + dy;

  // Verificação de colisão injetando a matriz de cena atual
  if (currentMap[Math.floor(newY)][Math.floor(newX)] === 0 || currentMap[Math.floor(newY)][Math.floor(newX)] >= 2) {
    player.x = newX;
    player.y = newY;
  }
}
