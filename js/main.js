import { player, updatePlayer, keys } from './entities/player.js';
import { castRays } from './core/renderer.js';
import { toggleSpellMode, onSpellCast, executeCompiledStroke } from './magic/capture.js';

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
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ]
};

let lastTime = performance.now();
let timeScale = 1.0;
let isChanneling = false;
let channelingTimer = 0;
let cacheSpell = null; 

const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');
const log = document.getElementById('spell-log');

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

function toggleGrimoire(open) {
  if (open && gameState === 'PLAYING') {
    gameState = 'PAUSED';
    grimoireMenu.style.display = 'flex';
  } else {
    gameState = 'PLAYING';
    grimoireMenu.style.display = 'none';
    lastTime = performance.now();
  }
}

function triggerActiveItemAction() {
  if (gameState === 'PAUSED' && grimoireMenu.style.display !== 'flex') return;

  if (document.getElementById('spell-overlay').style.display === 'flex') {
    executeCompiledStroke();
    return;
  }

  if (grimoireMenu.style.display === 'flex') {
    toggleGrimoire(false);
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: 
      if (!cacheSpell) {
        log.textContent = "Cache vazio! Desenhe a magia primeiro.";
        log.style.color = "#ff5500";
        return;
      }
      log.textContent = `Recast: ${cacheSpell.spellId} (Precisão: ${cacheSpell.accuracy}%)`;
      log.style.color = "#a0f";
      isChanneling = true;
      channelingTimer = 2000;
      break;

    case 1: 
      toggleGrimoire(true);
      break;

    case 2: 
      log.textContent = "Mão Vazia: Nenhuma ação disponível.";
      log.style.color = "#aaa";
      break;
  }
}

function setActiveSlot(index) {
  if (document.getElementById('spell-overlay').style.display === 'flex' || grimoireMenu.style.display === 'flex') return;
  Inventory.activeIndex = index;
  for (let i = 0; i <= 2; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) slot.style.borderColor = (i === index) ? '#0ff' : '#555';
  }
  log.textContent = `Equipado: ${Inventory.slots[index].name}`;
  log.style.color = "#fff";
}

document.getElementById('menu-btn')?.addEventListener('click', togglePause);
document.getElementById('resume-btn')?.addEventListener('click', togglePause);
document.getElementById('close-grimoire-btn')?.addEventListener('click', () => toggleGrimoire(false));
document.getElementById('action-btn')?.addEventListener('click', triggerActiveItemAction);

toggleMobileCheckbox?.addEventListener('change', (e) => {
  mobileControls.style.display = e.target.checked ? 'flex' : 'none';
});

for (let i = 0; i <= 2; i++) {
  document.getElementById(`slot-${i}`)?.addEventListener('click', () => setActiveSlot(i));
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') togglePause();
  if (e.key >= '1' && e.key <= '3') setActiveSlot(parseInt(e.key) - 1);
  if (e.key.toLowerCase() === 'e' && !isChanneling && gameState !== 'PAUSED') {
    timeScale = toggleSpellMode();
  }
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault(); 
    triggerActiveItemAction();
  }
});

document.getElementById('spell-btn')?.addEventListener('click', () => {
  if (!isChanneling && gameState !== 'PAUSED') timeScale = toggleSpellMode();
});

onSpellCast((spellResult) => {
  if (!spellResult || spellResult.spellId === 'Falha') {
    log.textContent = "Magia: Falha no traço";
    log.style.color = "#f00";
    return;
  }
  log.textContent = `Magia: ${spellResult.spellId} (Precisão: ${spellResult.accuracy}%)`;
  log.style.color = "#0ff";
  cacheSpell = spellResult; 
  isChanneling = true;
  channelingTimer = 3000; 
});

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;

  if (gameState !== 'PAUSED') {
    if (isChanneling) {
      channelingTimer -= deltaTime;
      if (channelingTimer <= 0) {
        isChanneling = false;
        log.textContent = `Equipado: ${Inventory.slots[Inventory.activeIndex].name}`;
        log.style.color = "#fff";
      }
    }

    if (!isChanneling && document.getElementById('spell-overlay').style.display !== 'flex') {
      updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
    }
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(0);
requestAnimationFrame(gameLoop);
