import { player, updatePlayer, keys } from './entities/player.js';
import { activeProjectiles, spawnProjectile, updateProjectiles } from './entities/projectile.js';
import { castRays } from './core/renderer.js';
import { toggleSpellMode, onSpellCast, appendCurrentRune } from './magic/capture.js';

export let gameState = 'PLAYING'; 
export const Inventory = {
  slots: [
    { id: 'spellbook', name: 'Caderno de Magias' },
    { id: 'grimoire', name: 'Grimório' },
    { id: 'empty', name: 'Mão Vazia' }
  ],
  activeIndex: 0
};

const SceneManager = {
  activeMap: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,1,1,0,1],
    [1,0,0,1,1,0,0,0,0,1,1,0,0,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,1,1,1,0,0,1,1,1,1,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,1,1,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,1,1,1,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ]
};

let lastTime = performance.now();
let timeScale = 1.0;
let cacheSpell = null; 

const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');
const spellLog = document.getElementById('spell-log');
const recastLog = document.getElementById('recast-log');
const itemLog = document.getElementById('item-log');

const keyButtonMap = {
  'w': 'mobile-up', 's': 'mobile-down', 'a': 'mobile-left', 'd': 'mobile-right',
  'arrowleft': 'mobile-rotate-left', 'arrowright': 'mobile-rotate-right',
  'shift': 'mobile-sprint', 'e': 'action1-btn', ' ': 'action2-btn', 'enter': 'action2-btn'
};

function animateKey(key, isDown) {
  const btnId = keyButtonMap[key.toLowerCase()];
  if (btnId) {
    const el = document.getElementById(btnId);
    if (el) {
      if (isDown) el.classList.add('btn-active');
      else el.classList.remove('btn-active');
    }
  }
}

function togglePause() {
  if (grimoireMenu.style.display === 'flex') {
    toggleGrimoire(false);
    return;
  }
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseMenu.style.display = 'flex';
  } else {
    gameState = 'PLAYING';
    pauseMenu.style.display = 'none';
    lastTime = performance.now();
  }
}

export function toggleGrimoire(open) {
  if (open && gameState === 'PLAYING') {
    gameState = 'PAUSED';
    grimoireMenu.style.display = 'flex';
  } else {
    gameState = 'PLAYING';
    grimoireMenu.style.display = 'none';
    lastTime = performance.now();
  }
}

function executeAction1() {
  if (gameState === 'PAUSED' && grimoireMenu.style.display !== 'flex') return;
  if (grimoireMenu.style.display === 'flex') { toggleGrimoire(false); return; }

  switch(Inventory.activeIndex) {
    case 0: toggleSpellMode(); break;
    case 1: toggleGrimoire(true); break;
    case 2: spellLog.textContent = "Ação 1 inativa."; spellLog.style.color = "#aaa"; break;
  }
}

function executeAction2() {
  if (gameState === 'PAUSED') return;

  if (document.getElementById('spell-overlay').style.display === 'flex') {
    appendCurrentRune(true); 
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: 
      if (!cacheSpell) {
        spellLog.textContent = "Cache Vazio!"; spellLog.style.color = "#ff5500";
        return;
      }
      spellLog.textContent = `Disparo Rápido: ${cacheSpell.spellId}`;
      spellLog.style.color = "#a0f";
      spawnProjectile(player, cacheSpell); // Gatilho de disparo da entidade via cache
      break;
    case 1:
      spellLog.textContent = "Grimório sem ação secundária."; spellLog.style.color = "#b89962";
      break;
  }
}

function setActiveSlot(index) {
  if (document.getElementById('spell-overlay').style.display === 'flex' || grimoireMenu.style.display === 'flex') return;
  Inventory.activeIndex = index;
  for (let i = 0; i <= 2; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      if (i === index) slot.classList.add('slot-active');
      else slot.classList.remove('slot-active');
    }
  }
  itemLog.textContent = `Equipado: ${Inventory.slots[index].name}`;
}

document.getElementById('menu-btn')?.addEventListener('click', togglePause);
document.getElementById('resume-btn')?.addEventListener('click', togglePause);
document.getElementById('close-grimoire-btn')?.addEventListener('click', () => toggleGrimoire(false));
document.getElementById('action1-btn')?.addEventListener('click', executeAction1);
document.getElementById('action2-btn')?.addEventListener('click', executeAction2);

toggleMobileCheckbox?.addEventListener('change', (e) => {
  mobileControls.style.display = e.target.checked ? 'flex' : 'none';
});

for (let i = 0; i <= 2; i++) {
  document.getElementById(`slot-${i}`)?.addEventListener('click', () => setActiveSlot(i));
}

window.addEventListener('keydown', e => {
  animateKey(e.key, true);
  if (e.key === 'Escape') togglePause();
  if (e.key >= '1' && e.key <= '3') setActiveSlot(parseInt(e.key) - 1);
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); executeAction1(); }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); executeAction2(); }
});

window.addEventListener('keyup', e => { animateKey(e.key, false); });

onSpellCast((spellResult) => {
  if (!spellResult || spellResult.spellId === 'Falha') {
    spellLog.textContent = "Magia: Falha no traço"; spellLog.style.color = "#f00";
    return;
  }
  spellLog.textContent = `Último Feitiço: ${spellResult.spellId} (${spellResult.accuracy}%)`;
  spellLog.style.color = "#0ff";
  cacheSpell = spellResult; 
  recastLog.textContent = `Recast Disponível: ${cacheSpell.spellId}`;
  
  spawnProjectile(player, spellResult); // Gatilho de disparo da entidade via desenho primário
});

document.querySelectorAll('.guide-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.activeWatermark = btn.getAttribute('data-rune');
    toggleGrimoire(false);
    toggleSpellMode();
  });
});

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;

  if (gameState !== 'PAUSED') {
    updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
    updateProjectiles(deltaTime, timeScale, SceneManager.activeMap); // Processamento da Física das Entidades
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(0);
requestAnimationFrame(gameLoop);
