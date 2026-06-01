import { player, updatePlayer } from './entities/player.js';
import { castRays } from './core/renderer.js';
import { toggleSpellMode, onSpellCast } from './magic/capture.js';

const SceneManager = {
  activeMap: null,
  overworldMap: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,3,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,1,1,0,1],
    [1,0,0,1,1,0,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1]
  ],
  dungeonMap: [
    [2,2,2,2,2,2,2,2],
    [2,0,0,0,0,0,0,2],
    [2,0,2,2,2,2,0,2],
    [2,0,0,0,0,4,0,2],
    [2,2,2,2,2,2,2,2]
  ],
  savedOverworldCoords: { x: 1.5, y: 1.5 }
};

SceneManager.activeMap = SceneManager.overworldMap;

let lastTime = performance.now();
let timeScale = 1.0;
let isChanneling = false;
let channelingTimer = 0;

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

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;

  if (isChanneling) {
    channelingTimer -= deltaTime;
    if (channelingTimer <= 0) {
      isChanneling = false;
      document.getElementById('spell-log').textContent = "Magia: Concluída";
    }
  }

  if (!isChanneling && document.getElementById('spell-overlay').style.display !== 'flex') {
    updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
  }
  
  checkPortalCollision();
  castRays(SceneManager.activeMap);
  
  requestAnimationFrame(gameLoop);
}

function checkPortalCollision() {
  const pX = Math.floor(player.x);
  const pY = Math.floor(player.y);
  
  if (!SceneManager.activeMap[pY] || SceneManager.activeMap[pY][pX] === undefined) return;
  
  const currentCell = SceneManager.activeMap[pY][pX];

  if (currentCell === 3 && SceneManager.activeMap === SceneManager.overworldMap) {
    // Salva a posição e altera para a masmorra
    SceneManager.savedOverworldCoords.x = player.x;
    SceneManager.savedOverworldCoords.y = player.y;
    SceneManager.activeMap = SceneManager.dungeonMap;
    // Realoca o jogador em uma coordenada segura (longe do bloco 4)
    player.x = 1.5;
    player.y = 1.5;
  } else if (currentCell === 4 && SceneManager.activeMap === SceneManager.dungeonMap) {
    // Retorna para o mundo aberto
    SceneManager.activeMap = SceneManager.overworldMap;
    // Adiciona 1.0 no eixo Y para evitar que o jogador caia de volta no portal 3
    player.x = SceneManager.savedOverworldCoords.x;
    player.y = SceneManager.savedOverworldCoords.y + 1.0;
  }
}

document.getElementById('spell-btn')?.addEventListener('click', () => {
  if (!isChanneling) timeScale = toggleSpellMode();
});

document.getElementById('close-spell-btn')?.addEventListener('click', () => {
  timeScale = toggleSpellMode();
});

window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'e' && !isChanneling) {
    timeScale = toggleSpellMode();
  }
});

requestAnimationFrame(gameLoop);
