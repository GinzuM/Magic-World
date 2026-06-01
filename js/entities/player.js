export const player = {
  x: 5.5,
  y: 5.5,
  angle: 0,
  
  // Atributos de Movimentação
  baseSpeed: 0.0525,
  sprintMultiplier: 1.8,
  rotSpeed: 2.2,
  
  // Atributos de RPG (HUD)
  hp: 100,
  maxHp: 100,
  mana: 100,
  maxMana: 100,
  hpRegen: 0.005,
  manaRegen: 0.08,
  armor: 0,
  damageMod: 1.0,
  
  // Multiplicadores de Magia (Buffs Temporários)
  speedBuff: 1.0,
  armorBuff: 0,
  regenManaBuff: 1.0,
  regenHpBuff: 1.0
};

export const keys = {};

// Captura de Teclado
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// Mapeamento de Controles Mobile
function bindBtn(id, key) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[key] = true; });
  btn.addEventListener('pointerup', (e) => { e.preventDefault(); keys[key] = false; });
  btn.addEventListener('pointerleave', (e) => { e.preventDefault(); keys[key] = false; });
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
  
  // 1. Processamento de Regeneração Passiva
  if (player.hp < player.maxHp) {
    player.hp += player.hpRegen * player.regenHpBuff * timeMultiplier;
    if (player.hp > player.maxHp) player.hp = player.maxHp;
  }
  if (player.mana < player.maxMana) {
    player.mana += player.manaRegen * player.regenManaBuff * timeMultiplier;
    if (player.mana > player.maxMana) player.mana = player.maxMana;
  }

  // 2. Cálculo de Velocidade (Base + Sprint + Buff de Magia)
  const currentSpeed = (keys['shift'] ? player.baseSpeed * player.sprintMultiplier : player.baseSpeed) * player.speedBuff * timeMultiplier;
  const rot = player.rotSpeed * timeMultiplier;
  
  let dx = 0, dy = 0;

  if (keys['w']) { 
    dx += Math.cos(degToRad(player.angle)) * currentSpeed; 
    dy += Math.sin(degToRad(player.angle)) * currentSpeed; 
  }
  if (keys['s']) { 
    dx -= Math.cos(degToRad(player.angle)) * currentSpeed; 
    dy -= Math.sin(degToRad(player.angle)) * currentSpeed; 
  }
  if (keys['a']) { 
    dx += Math.cos(degToRad(player.angle - 90)) * currentSpeed; 
    dy += Math.sin(degToRad(player.angle - 90)) * currentSpeed; 
  }
  if (keys['d']) { 
    dx += Math.cos(degToRad(player.angle + 90)) * currentSpeed; 
    dy += Math.sin(degToRad(player.angle + 90)) * currentSpeed; 
  }
  
  // 3. Rotação da Câmera
  if (keys['arrowleft']) player.angle = (player.angle - rot + 360) % 360;
  if (keys['arrowright']) player.angle = (player.angle + rot) % 360;

  // 4. Detecção de Colisão Deslizante (Wall = 1, Floor = 0, Portals > 1)
  const newX = player.x + dx;
  const newY = player.y + dy;

  // Checa colisão em X
  if (map[Math.floor(player.y)] && (map[Math.floor(player.y)][Math.floor(newX)] === 0 || map[Math.floor(player.y)][Math.floor(newX)] > 1)) {
    player.x = newX;
  }
  // Checa colisão em Y
  if (map[Math.floor(newY)] && (map[Math.floor(newY)][Math.floor(player.x)] === 0 || map[Math.floor(newY)][Math.floor(player.x)] > 1)) {
    player.y = newY;
  }
}
