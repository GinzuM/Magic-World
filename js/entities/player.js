export const player = {
  x: 5.5,
  y: 5.5,
  z: 0, // Offset de altura da câmera (modificado pelo agachamento)
  angle: 0,
  
  // Atributos de Movimentação
  baseSpeed: 0.0525,
  sprintMultiplier: 1.8,
  crouchMultiplier: 0.4, // Lentidão ao abaixar
  
  // Estados Especiais
  isMeditating: false,
  isCrouching: false,
  
  // Atributos de RPG (HUD)
  hp: 100,
  maxHp: 100,
  mana: 100,
  maxMana: 100,
  hpRegen: 0.005,
  manaRegen: 0.08,
  armor: 0,
  damageMod: 1.0,
  coins: 0,
  
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
  
  // 1. Definição de Estados Pessoais
  player.isCrouching = keys['control'] && !player.isMeditating;
  
  // Animação suave da altura da câmera (Z-offset)
  const targetZ = player.isCrouching ? -150 : 0; 
  player.z += (targetZ - player.z) * 0.2 * timeMultiplier;
  
  // 2. Processamento de Regeneração Passiva
  let currentManaRegen = player.manaRegen * player.regenManaBuff;
  if (player.isMeditating) {
    currentManaRegen *= 1.5; // Multiplicador de Meditação
  }

  if (player.hp < player.maxHp) {
    player.hp += player.hpRegen * player.regenHpBuff * timeMultiplier;
    if (player.hp > player.maxHp) player.hp = player.maxHp;
  }
  if (player.mana < player.maxMana) {
    player.mana += currentManaRegen * timeMultiplier;
    if (player.mana > player.maxMana) player.mana = player.maxMana;
  }

  // Se estiver meditando, bloqueia completamente os cálculos cinemáticos
  if (player.isMeditating) return;

  // 3. Cálculo de Velocidade (Base + Sprint/Crouch + Buff de Magia)
  let moveMult = 1.0;
  if (player.isCrouching) moveMult = player.crouchMultiplier;
  else if (keys['shift']) moveMult = player.sprintMultiplier;

  const currentSpeed = player.baseSpeed * moveMult * player.speedBuff * timeMultiplier;
  
  // Aplicação da Sensibilidade Dinâmica via UI Slider
  const sensSlider = document.getElementById('sens-slider');
  const sens = sensSlider ? parseFloat(sensSlider.value) : 2.2;
  const rot = sens * timeMultiplier;
  
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
  
  // 4. Rotação da Câmera
  if (keys['arrowleft']) player.angle = (player.angle - rot + 360) % 360;
  if (keys['arrowright']) player.angle = (player.angle + rot) % 360;

  // 5. Detecção de Colisão Deslizante
  const newX = player.x + dx;
  const newY = player.y + dy;

  // Função para checar passabilidade do bloco (Chão e Portais são passáveis, 4 e 5 são sólidos)
  const isPassable = (x, y) => {
    let block = map[Math.floor(y)] ? map[Math.floor(y)][Math.floor(x)] : 1;
    return block === 0 || block === 2 || block === 3;
  };

  if (isPassable(newX, player.y)) {
    player.x = newX;
  }
  if (isPassable(player.x, newY)) {
    player.y = newY;
  }
}
