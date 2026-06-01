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
let cacheSpell = null; // Armazenamento do último feitiço bem-sucedido

const pauseMenu = document.getElementById('pause-menu');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');
const log = document.getElementById('spell-log');

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseMenu.style.display = 'flex';
  } else {
    gameState = 'PLAYING';
    pauseMenu.style.display = 'none';
    lastTime = performance.now();
  }
}

// Centralização das Ações Contextuais do Inventário
function triggerActiveItemAction() {
  if (gameState === 'PAUSED') return;

  // Se o painel de desenho estiver aberto, o botão de ação força a execução do traço atual
  if (document.getElementById('spell-overlay').style.display === 'flex') {
    executeCompiledStroke();
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: // Caderno de Magias: Recast Rápido (sem abrir a tela)
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

    case 1: // Grimório: Ação de ativação direta
      log.textContent = "Grimório Ativado: Escudo Rúnico Absorvente!";
      log.style.color = "#ff00ff";
      isChanneling = true;
      channelingTimer = 1500;
      break;

    case 2: // Mão Vazia
      log.textContent = "Mão Vazia: Nenhuma ação disponível.";
      log.style.color = "#aaa";
      break;
  }
}

function setActiveSlot(index) {
  Inventory.activeIndex = index;
  for (let i = 0; i <= 2; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) slot.style.borderColor = (i === index) ? '#0ff' : '#555';
  }
  log.textContent = `Equipado: ${Inventory.slots[index].name}`;
  log.style.color = "#fff";
}

// Vinculação de Eventos de Interface
document.getElementById('menu-btn')?.addEventListener('click', togglePause);
document.getElementById('resume-btn')?.addEventListener('click', togglePause);
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
    e.preventDefault(); // Impede scroll indesejado da página com o Space
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
  cacheSpell = spellResult; // Alimenta o cache de recast
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
