import { player, updatePlayer, keys } from './entities/player.js';
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
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
  ]
};

let lastTime = performance.now();
let cacheSpell = null; 

const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');
const log = document.getElementById('spell-log');
const recastLog = document.getElementById('recast-log');

// Dicionário de vinculação Tecla -> Elemento Virtual para Animação
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

// Execução de Habilidades por Slot (Ações Universais)
function executeAction1() {
  if (gameState === 'PAUSED' && grimoireMenu.style.display !== 'flex') return;
  if (grimoireMenu.style.display === 'flex') { toggleGrimoire(false); return; }

  switch(Inventory.activeIndex) {
    case 0: // Caderno -> Abre painel de desenho
      toggleSpellMode();
      break;
    case 1: // Grimório -> Abre painel de guias
      toggleGrimoire(true);
      break;
    case 2:
      log.textContent = "Ação 1 indisponível."; log.style.color = "#aaa";
      break;
  }
}

function executeAction2() {
  if (gameState === 'PAUSED') return;

  // Se a tela de desenho estiver ativa, o botão confirma e une as runas
  if (document.getElementById('spell-overlay').style.display === 'flex') {
    appendCurrentRune(true); 
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: // Caderno -> Recast Instantâneo sem travar movimento
      if (!cacheSpell) {
        log.textContent = "Cache Vazio!"; log.style.color = "#ff5500";
        return;
      }
      log.textContent = `Disparo: ${cacheSpell.spellId} (${cacheSpell.accuracy}%)`;
      log.style.color = "#a0f";
      break;
    case 1:
      log.textContent = "Grimório não possui ação secundária."; log.style.color = "#8a6d3b";
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
  document.getElementById('item-log').textContent = `Equipado: ${Inventory.slots[index].name}`;
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

// Gerenciamento e Animação de Teclas Físicas
window.addEventListener('keydown', e => {
  animateKey(e.key, true);
  if (e.key === 'Escape') togglePause();
  if (e.key >= '1' && e.key <= '3') setActiveSlot(parseInt(e.key) - 1);
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); executeAction1(); }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); executeAction2(); }
});

window.addEventListener('keyup', e => {
  animateKey(e.key, false);
});

onSpellCast((spellResult) => {
  if (!spellResult || spellResult.spellId === 'Falha') {
    log.textContent = "Magia: Falha no traço"; log.style.color = "#f00";
    return;
  }
  log.textContent = `Magia: ${spellResult.spellId} (Precisão: ${spellResult.accuracy}%)`;
  log.style.color = "#0ff";
  cacheSpell = spellResult; 
  recastLog.textContent = `Recast Disponível: ${cacheSpell.spellId}`;
});

// Configuração das diretrizes de marcas-d'água do Grimório
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
    // A trava isChanneling foi eliminada: atualização de física liberada em 100% do loop
    updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(0);
requestAnimationFrame(gameLoop);
