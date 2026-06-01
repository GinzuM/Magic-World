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

const structures = [
  // 1. Ruína Simples com Portal (3x3)
  { w: 3, h: 3, data: [[1,1,1],[1,2,1],[1,0,1]] },
  // 2. Altar Aberto (5x5)
  { w: 5, h: 5, data: [
    [1,0,1,0,1],
    [0,0,0,0,0],
    [1,0,2,0,1],
    [0,0,0,0,0],
    [1,0,1,0,1]
  ]},
  // 3. Templo Fechado (5x5)
  { w: 5, h: 5, data: [
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,2,0,1],
    [1,0,0,0,1],
    [1,1,0,1,1]
  ]},
  // 4. Pilares em Cruz (5x5)
  { w: 5, h: 5, data: [
    [0,1,0,1,0],
    [1,0,0,0,1],
    [0,0,2,0,0],
    [1,0,0,0,1],
    [0,1,0,1,0]
  ]},
  // 5. Encruzilhada Murada (4x4)
  { w: 4, h: 4, data: [
    [1,1,1,1],
    [1,0,0,1],
    [1,2,0,0],
    [1,1,1,1]
  ]}
];

function generateOverworld(size) {
  const map = Array.from({ length: size }, () => new Uint8Array(size).fill(0));
  
  for (let i = 0; i < size; i++) {
    map[0][i] = 1; map[size - 1][i] = 1; map[i][0] = 1; map[i][size - 1] = 1;
  }
  
  const numRuins = 500; 
  for (let i = 0; i < numRuins; i++) {
    let rx = Math.floor(Math.random() * (size - 20)) + 10;
    let ry = Math.floor(Math.random() * (size - 20)) + 10;
    
    if(rx < 15 && ry < 15) continue; 
    
    let struct = structures[Math.floor(Math.random() * structures.length)];
    
    for(let sy = 0; sy < struct.h; sy++) {
      for(let sx = 0; sx < struct.w; sx++) {
        if(struct.data[sy][sx] !== 0) {
          map[ry + sy][rx + sx] = struct.data[sy][sx];
        }
      }
    }
  }
  return map;
}

function generateDungeon(size) {
  const map = Array.from({ length: size }, () => new Uint8Array(size).fill(1));
  let x = Math.floor(size/2);
  let y = Math.floor(size/2);
  let floorTiles = 0;
  const maxFloor = Math.floor(size * size * 0.4);
  
  map[y][x] = 0;
  
  while(floorTiles < maxFloor) {
    if(map[y][x] === 1) { map[y][x] = 0; floorTiles++; }
    let dir = Math.floor(Math.random() * 4);
    if(dir === 0 && x < size - 2) x++;
    else if(dir === 1 && x > 1) x--;
    else if(dir === 2 && y < size - 2) y++;
    else if(dir === 3 && y > 1) y--;
  }
  
  map[Math.floor(size/2)][Math.floor(size/2)] = 3; 
  map[y][x] = 2; 
  
  return map;
}

export const SceneManager = {
  isDungeon: false,
  overworldMap: generateOverworld(1000),
  dungeonFloors: [],
  currentFloorIndex: -1,
  savedOverworldCoords: { x: 5.5, y: 5.5 },
  activeMap: null,
  
  enterPortal: function(type) {
    if (!this.isDungeon) {
      this.savedOverworldCoords = { x: player.x, y: player.y };
      this.isDungeon = true;
      this.currentFloorIndex = 0;
      
      if(this.dungeonFloors.length === 0) this.dungeonFloors.push(generateDungeon(40));
      this.activeMap = this.dungeonFloors[0];
      
      player.x = Math.floor(this.activeMap.length/2) + 0.5;
      player.y = Math.floor(this.activeMap.length/2) + 1.5;
      document.getElementById('map-log').textContent = "Masmorra - Andar 1";
      document.getElementById('map-log').style.color = "#a00";
    } else {
      if (type === 'down') {
        this.currentFloorIndex++;
        if(!this.dungeonFloors[this.currentFloorIndex]) {
            this.dungeonFloors.push(generateDungeon(40 + this.currentFloorIndex * 5));
        }
        this.activeMap = this.dungeonFloors[this.currentFloorIndex];
        player.x = Math.floor(this.activeMap.length/2) + 0.5;
        player.y = Math.floor(this.activeMap.length/2) + 1.5;
        document.getElementById('map-log').textContent = `Masmorra - Andar ${this.currentFloorIndex + 1}`;
      } else if (type === 'up') {
        this.currentFloorIndex--;
        if (this.currentFloorIndex < 0) {
          this.isDungeon = false;
          this.activeMap = this.overworldMap;
          player.x = this.savedOverworldCoords.x;
          player.y = this.savedOverworldCoords.y + 1.5; 
          document.getElementById('map-log').textContent = "Mundo Aberto";
          document.getElementById('map-log').style.color = "#fa0";
        } else {
          this.activeMap = this.dungeonFloors[this.currentFloorIndex];
          player.x = Math.floor(this.activeMap.length/2) + 0.5;
          player.y = Math.floor(this.activeMap.length/2) + 1.5;
          document.getElementById('map-log').textContent = `Masmorra - Andar ${this.currentFloorIndex + 1}`;
        }
      }
    }
    activeProjectiles.length = 0; 
  }
};

SceneManager.activeMap = SceneManager.overworldMap;
player.x = 5.5; player.y = 5.5; 

let lastTime = performance.now();
let timeScale = 1.0;
let cacheSpell = null; 
let globalCooldown = 0;
let portalCooldown = 0;

const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const mobileControls = document.getElementById('mobile-controls');
const toggleMobileCheckbox = document.getElementById('toggle-mobile-controls');
const spellLog = document.getElementById('spell-log');
const recastLog = document.getElementById('recast-log');
const itemLog = document.getElementById('item-log');
const statusBars = document.getElementById('status-bars');

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

  if (globalCooldown > 0) {
    spellLog.textContent = "Em Recarga..."; 
    spellLog.style.color = "#ffaa00";
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: 
      if (!cacheSpell) {
        spellLog.textContent = "Cache Vazio!"; spellLog.style.color = "#ff5500";
        return;
      }
      let cd = spawnProjectile(player, cacheSpell);
      if (cd) globalCooldown = cd;
      spellLog.textContent = `Disparo: ${cacheSpell.spellId}`;
      spellLog.style.color = "#a0f";
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
  
  if (globalCooldown > 0) {
    spellLog.textContent = "Em Recarga..."; 
    spellLog.style.color = "#ffaa00";
    return;
  }

  spellLog.textContent = `Feitiço: ${spellResult.spellId} (${spellResult.accuracy}%)`;
  spellLog.style.color = "#0ff";
  cacheSpell = spellResult; 
  recastLog.textContent = `Recast: ${cacheSpell.spellId}`;
  
  let cd = spawnProjectile(player, spellResult); 
  if (cd) globalCooldown = cd;
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
    if (globalCooldown > 0) globalCooldown -= deltaTime;
    if (portalCooldown > 0) portalCooldown -= deltaTime;

    updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
    updateProjectiles(deltaTime, timeScale, SceneManager.activeMap);

    // Update UI Status Bars se as propriedades existirem
    if (player.hp !== undefined) {
      statusBars.children[0].children[0].style.width = Math.max(0, (player.hp / player.maxHp) * 100) + '%';
      statusBars.children[1].children[0].style.width = Math.max(0, (player.mana / player.maxMana) * 100) + '%';
    }

    if (portalCooldown <= 0) {
      let px = Math.floor(player.x);
      let py = Math.floor(player.y);
      for(let dy=-1; dy<=1; dy++) {
        for(let dx=-1; dx<=1; dx++) {
          let ty = py+dy, tx = px+dx;
          if(SceneManager.activeMap[ty] && SceneManager.activeMap[ty][tx] > 1) {
            let dist = Math.hypot(player.x - (tx+0.5), player.y - (ty+0.5));
            if(dist < 0.8) {
              if(SceneManager.activeMap[ty][tx] === 2) { 
                SceneManager.enterPortal('down'); 
                portalCooldown = 1500; 
              } else if(SceneManager.activeMap[ty][tx] === 3) { 
                SceneManager.enterPortal('up'); 
                portalCooldown = 1500; 
              }
            }
          }
        }
      }
    }
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(0);
requestAnimationFrame(gameLoop);
