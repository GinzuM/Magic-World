import { player, updatePlayer } from './entities/player.js';
import { castRays } from './core/renderer.js';
import { toggleSpellMode, onSpellCast } from './magic/capture.js';

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
  activeMap: null,
  overworldMap: [
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
  ],
  savedOverworldCoords: { x: 1.5, y: 1.5 }
};

SceneManager.activeMap = SceneManager.overworldMap;

let lastTime = performance.now();
let timeScale = 1.0;
let isChanneling = false;
let channelingTimer = 0;

// --- GESTÃO DE UI E ESTADO ---
const pauseMenu = document.getElementById('pause-menu');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');

function togglePause() {
  if (gameState === 'PLAYING') {
    gameState = 'PAUSED';
    pauseMenu.style.display = 'flex';
  } else {
    gameState = 'PLAYING';
    pauseMenu.style.display = 'none';
    lastTime = performance.now(); // Evita salto de delta ao despausar
  }
}

document.getElementById('menu-btn')?.addEventListener('click', togglePause);
document.getElementById('resume-btn')?.addEventListener('click', togglePause);

toggleMobileCheckbox?.addEventListener('change', (e) => {
  mobileControls.style.display = e.target.checked ? 'flex' : 'none';
});

function setActiveSlot(index) {
  Inventory.activeIndex = index;
  for (let i = 0; i <= 2; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) slot.style.borderColor = (i === index) ? '#0ff' : '#555';
  }
  document.getElementById('spell-log').textContent = `Equipado: ${Inventory.slots[index].name}`;
  document.getElementById('spell-log').style.color = "#fff";
}

for (let i = 0; i <= 2; i++) {
  document.getElementById(`slot-${i}`)?.addEventListener('click', () => setActiveSlot(i));
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') togglePause();
  if (e.key >= '1' && e.key <= '3') setActiveSlot(parseInt(e.key) - 1);
  if (e.key.toLowerCase() === 'e' && !isChanneling && gameState !== 'PAUSED') timeScale = toggleSpellMode();
});

document.getElementById('spell-btn')?.addEventListener('click', () => {
  if (!isChanneling && gameState !== 'PAUSED') timeScale = toggleSpellMode();
});

document.getElementById('close-spell-btn')?.addEventListener('click', () => {
  timeScale = toggleSpellMode();
});

// --- MOTOR DE MAGIA ---
onSpellCast((spellResult) => {
  const log = document.getElementById('spell-log');
  if (!spellResult || spellResult.spellId === 'Falha') {
    log.textContent = "Magia: Falha no traço";
    log.style.color = "#f00";
    return;
  }
  log.textContent = `Magia: ${spellResult.spellId} (Precisão: ${spellResult.accuracy}%)`;
  log.style.color = "#0ff";

  if (spellResult.spellId === 'O') {
    isChanneling = true;
    channelingTimer = 3000; 
  }
});

// --- RENDERIZADOR ---
function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;

  if (gameState !== 'PAUSED') {
    if (isChanneling) {
      channelingTimer -= deltaTime;
      if (channelingTimer <= 0) {
        isChanneling = false;
        document.getElementById('spell-log').textContent = `Equipado: ${Inventory.slots[Inventory.activeIndex].name}`;
        document.getElementById('spell-log').style.color = "#fff";
      }
    }

    if (!isChanneling && document.getElementById('spell-overlay').style.display !== 'flex') {
      updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
    }
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(0); // Inicia com o Caderno equipado
requestAnimationFrame(gameLoop);
