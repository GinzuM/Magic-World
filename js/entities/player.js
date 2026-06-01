export const player = {
  x: 1.5,
  y: 1.5,
  angle: 0,
  baseSpeed: 0.0525,
  sprintMultiplier: 1.8,
  rotSpeed: 2.1,
  friction: 0.8,
  acceleration: 0.015
};

export const keys = {};

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Mapeamento Mobile
function bindBtn(id, key) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('pointerdown', () => keys[key] = true);
  btn.addEventListener('pointerup', () => keys[key] = false);
  btn.addEventListener('pointerleave', () => keys[key] = false);
}

bindBtn('mobile-up', 'w');
bindBtn('mobile-down', 's');
bindBtn('mobile-left', 'a');
bindBtn('mobile-right', 'd');
bindBtn('mobile-rotate-left', 'arrowleft');
bindBtn('mobile-rotate-right', 'arrowright');
bindBtn('mobile-sprint', 'shift');

function degToRad(deg) { return deg * Math.PI / 180; }

export function updatePlayer(deltaTime, timeScale, map) {
  const timeMultiplier = (deltaTime / 16) * timeScale;
  
  // Cálculo de aceleração baseada no Sprint
  const currentAccel = keys['shift'] ? player.acceleration * player.sprintMultiplier : player.acceleration;
  const accel = currentAccel * timeMultiplier;
  const rot = player.rotSpeed * timeMultiplier;
  
  let dx = 0, dy = 0;

  if (keys['w']) { dx += Math.cos(degToRad(player.angle)) * accel; dy += Math.sin(degToRad(player.angle)) * accel; }
  if (keys['s']) { dx -= Math.cos(degToRad(player.angle)) * accel; dy -= Math.sin(degToRad(player.angle)) * accel; }
  if (keys['a']) { dx += Math.cos(degToRad(player.angle - 90)) * accel; dy += Math.sin(degToRad(player.angle - 90)) * accel; }
  if (keys['d']) { dx += Math.cos(degToRad(player.angle + 90)) * accel; dy += Math.sin(degToRad(player.angle + 90)) * accel; }
  
  if (keys['arrowleft']) player.angle = (player.angle - rot + 360) % 360;
  if (keys['arrowright']) player.angle = (player.angle + rot) % 360;

  const newX = player.x + dx;
  const newY = player.y + dy;

  // Lógica de colisão
  if (map[Math.floor(newY)] && (map[Math.floor(newY)][Math.floor(newX)] === 0 || map[Math.floor(newY)][Math.floor(newX)] >= 3)) {
    player.x = newX;
    player.y = newY;
  }
}
