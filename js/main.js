import { player, updatePlayer, keys } from './entities/player.js';
import { activeProjectiles, spawnProjectile, updateProjectiles } from './entities/projectile.js';
import { castRays } from './core/renderer.js';
import { toggleSpellMode, onSpellCast, appendCurrentRune, undoLastRune, getSpellQueue } from './magic/capture.js';
import { SpellRegistry, calculateSpellStats } from './magic/spellbook.js';

export let gameState = 'PLAYING'; 
export const Inventory = {
  slots: [
    { id: 'spellbook', name: 'Caderno de Magias' },
    { id: 'grimoire', name: 'Grimório' },
    { id: 'map', name: 'Mapa Tático Global' },
    { id: 'empty', name: 'Mão Vazia' }
  ],
  activeIndex: 3 // Começa com a mão vazia
};

player.coins = 0;

// Geração de Mundo 500x500
const WORLD_SIZE = 500;

const structures = [
  { w: 3, h: 3, data: [[1,1,1],[1,2,1],[1,0,1]] },
  { w: 5, h: 5, data: [[1,0,1,0,1],[0,0,0,0,0],[1,0,2,0,1],[0,0,0,0,0],[1,0,1,0,1]] },
  { w: 5, h: 5, data: [[1,1,1,1,1],[1,0,0,0,1],[1,0,2,0,1],[1,0,0,0,1],[1,1,0,1,1]] }
];

function generateOverworld(size) {
  const map = Array.from({ length: size }, () => new Uint8Array(size).fill(0));
  for (let i = 0; i < size; i++) {
    map[0][i] = 1; map[size - 1][i] = 1; map[i][0] = 1; map[i][size - 1] = 1;
  }
  
  // Praça Central Aberta (Santuário de Spawn) - Evita a sensação de estar preso
  const centerSize = 20;
  const cStart = Math.floor(size / 2) - Math.floor(centerSize / 2);
  for(let y = 0; y < centerSize; y++) {
    for(let x = 0; x < centerSize; x++) {
      // Cria pilares espaçados ao redor do spawn em vez de paredes sólidas
      if ((x === 0 || x === centerSize-1) && (y % 4 === 0)) map[cStart+y][cStart+x] = 1;
      if ((y === 0 || y === centerSize-1) && (x % 4 === 0)) map[cStart+y][cStart+x] = 1;
    }
  }

  // Limpa a área exata do jogador por segurança
  map[Math.floor(size/2)][Math.floor(size/2)] = 0;

  const numRuins = 200; 
  const dungeonsList = [];
  
  for (let i = 0; i < numRuins; i++) {
    let rx = Math.floor(Math.random() * (size - 20)) + 10;
    let ry = Math.floor(Math.random() * (size - 20)) + 10;
    
    // Evita spawnar dungeons muito perto da praça central
    if(Math.abs(rx - size/2) < 25 && Math.abs(ry - size/2) < 25) continue; 
    
    let struct = structures[Math.floor(Math.random() * structures.length)];
    let hasPortal = false;
    let px = rx, py = ry;

    for(let sy = 0; sy < struct.h; sy++) {
      for(let sx = 0; sx < struct.w; sx++) {
        if(struct.data[sy][sx] !== 0) {
          map[ry + sy][rx + sx] = struct.data[sy][sx];
          if(struct.data[sy][sx] === 2) { hasPortal = true; px = rx+sx; py = ry+sy; }
        }
      }
    }
    
    if (hasPortal) {
      dungeonsList.push({
        x: px, y: py,
        maxFloors: Math.floor(Math.random() * 5) + 1,
        difficulty: Math.floor(Math.random() * 100),
        cleared: false
      });
    }
  }
  return { map, dungeonsList };
}

function generateDungeonFloor(size, difficulty) {
  const map = Array.from({ length: size }, () => new Uint8Array(size).fill(1));
  let x = Math.floor(size/2);
  let y = Math.floor(size/2);
  let floorTiles = 0;
  const maxFloor = Math.floor(size * size * 0.4);
  let chests = 0;
  
  map[y][x] = 0;
  
  while(floorTiles < maxFloor) {
    if(map[y][x] === 1) { 
      map[y][x] = 0; 
      floorTiles++; 
      
      let rand = Math.random() * 100;
      if(rand < 3) map[y][x] = 4; // Caixa
      else if(rand < 3.5 && chests < 2) { map[y][x] = 5; chests++; } // Baú
    }
    let dir = Math.floor(Math.random() * 4);
    if(dir === 0 && x < size - 2) x++;
    else if(dir === 1 && x > 1) x--;
    else if(dir === 2 && y < size - 2) y++;
    else if(dir === 3 && y > 1) y--;
  }
  
  map[Math.floor(size/2)][Math.floor(size/2)] = 3; 
  map[y][x] = 2; 
  
  return { map, chests };
}

const worldData = generateOverworld(WORLD_SIZE);

export const SceneManager = {
  isDungeon: false,
  overworldMap: worldData.map,
  dungeonsList: worldData.dungeonsList,
  currentDungeonRef: null,
  dungeonData: { floors: [], currentFloor: 0, maxFloors: 0, totalChests: 0, foundChests: 0 },
  savedOverworldCoords: { x: WORLD_SIZE/2, y: WORLD_SIZE/2 },
  activeMap: worldData.map,
  
  enterPortal: function(type, px, py) {
    if (!this.isDungeon) {
      this.currentDungeonRef = this.dungeonsList.find(d => Math.abs(d.x - px) < 2 && Math.abs(d.y - py) < 2);
      if(!this.currentDungeonRef) return;

      this.savedOverworldCoords = { x: player.x, y: player.y };
      this.isDungeon = true;
      this.dungeonData.maxFloors = this.currentDungeonRef.maxFloors;
      this.dungeonData.currentFloor = this.currentDungeonRef.maxFloors; 
      this.dungeonData.floors = [];
      this.dungeonData.totalChests = 0;
      this.dungeonData.foundChests = 0;

      for(let i=0; i<this.dungeonData.maxFloors; i++) {
        let floorGen = generateDungeonFloor(30 + (this.currentDungeonRef.difficulty/10), this.currentDungeonRef.difficulty);
        this.dungeonData.floors.push(floorGen.map);
        this.dungeonData.totalChests += floorGen.chests;
      }
      
      this.loadFloor();
    } else {
      if (type === 'down') { 
        this.dungeonData.currentFloor--;
        if (this.dungeonData.currentFloor < 1) this.dungeonData.currentFloor = 1;
        this.loadFloor();
      } else if (type === 'up') { 
        this.dungeonData.currentFloor++;
        if (this.dungeonData.currentFloor > this.dungeonData.maxFloors) {
          this.exitDungeon();
        } else {
          this.loadFloor();
        }
      }
    }
  },

  loadFloor: function() {
    this.activeMap = this.dungeonData.floors[this.dungeonData.currentFloor - 1];
    player.x = Math.floor(this.activeMap.length/2) + 0.5;
    player.y = Math.floor(this.activeMap.length/2) + 1.5;
    activeProjectiles.length = 0;
    this.updateDungeonHUD();
  },

  exitDungeon: function() {
    this.isDungeon = false;
    this.activeMap = this.overworldMap;
    player.x = this.savedOverworldCoords.x;
    player.y = this.savedOverworldCoords.y + 1.5;
    this.currentDungeonRef.cleared = true;
    activeProjectiles.length = 0;
    document.getElementById('map-log').textContent = "Mundo Aberto";
    document.getElementById('map-log').style.color = "#fa0";
    document.getElementById('dungeon-hud').style.display = 'none';
  },

  updateDungeonHUD: function() {
    if(this.isDungeon) {
      document.getElementById('dungeon-hud').style.display = 'flex';
      document.getElementById('map-log').textContent = "Masmorra";
      document.getElementById('map-log').style.color = "#f55";
      document.getElementById('dh-floor').textContent = `${this.dungeonData.currentFloor}/${this.dungeonData.maxFloors}`;
      document.getElementById('dh-chests').textContent = `${this.dungeonData.foundChests}/${this.dungeonData.totalChests}`;
    }
  }
};

// Spawn inicial no centro absoluto do mundo
player.x = WORLD_SIZE / 2;
player.y = WORLD_SIZE / 2;

let lastTime = performance.now();
let timeScale = 1.0;
let cacheSpell = null; 
let globalCooldown = 0;
let portalCooldown = 0;
let beaconTarget = null;

// Variáveis do Mapa Tático
let mapZoom = 1.0;
let mapOffsetX = 0;
let mapOffsetY = 0;
let isDraggingMap = false;
let dragStartX = 0;
let dragStartY = 0;

const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const spellOverlay = document.getElementById('spell-overlay');
const mapOverlay = document.getElementById('map-overlay');
const spellLog = document.getElementById('spell-log');
const recastLog = document.getElementById('recast-log');
const itemLog = document.getElementById('item-log');
const mapCanvas = document.getElementById('world-map-canvas');

const grimEntries = Object.values(SpellRegistry).sort((a,b) => a.id.localeCompare(b.id));
let grimPage = 0;

// Atualização de UI de Configuração (Sensibilidade)
document.getElementById('sens-slider')?.addEventListener('input', (e) => {
  document.getElementById('sens-val').textContent = parseFloat(e.target.value).toFixed(1);
});

function updateGrimoireView() {
  const left = grimEntries[grimPage];
  const right = grimEntries[grimPage + 1];

  if (left) {
    document.getElementById('gp-left-title').textContent = left.id + ' - ' + left.name;
    document.getElementById('gp-left-desc').textContent = left.desc;
    document.getElementById('gp-left-stats').textContent = left.stats;
    document.getElementById('gp-left-img').textContent = left.id;
    document.getElementById('gp-left-guide').setAttribute('data-rune', left.id);
    document.getElementById('grimoire-page-left').style.visibility = 'visible';
  } else {
    document.getElementById('grimoire-page-left').style.visibility = 'hidden';
  }

  if (right) {
    document.getElementById('gp-right-title').textContent = right.id + ' - ' + right.name;
    document.getElementById('gp-right-desc').textContent = right.desc;
    document.getElementById('gp-right-stats').textContent = right.stats;
    document.getElementById('gp-right-img').textContent = right.id;
    document.getElementById('gp-right-guide').setAttribute('data-rune', right.id);
    document.getElementById('grimoire-page-right').style.visibility = 'visible';
  } else {
    document.getElementById('grimoire-page-right').style.visibility = 'hidden';
  }
}

document.getElementById('grim-prev')?.addEventListener('click', () => { if(grimPage > 0) { grimPage -= 2; updateGrimoireView(); }});
document.getElementById('grim-next')?.addEventListener('click', () => { if(grimPage < grimEntries.length - 2) { grimPage += 2; updateGrimoireView(); }});

function updateViewModel() {
  const vm = document.getElementById('vm-sprite');
  vm.className = '';
  if (Inventory.activeIndex === 0) vm.className = 'vm-book';
  else if (Inventory.activeIndex === 1) vm.className = 'vm-grimoire';
  else if (Inventory.activeIndex === 2) vm.className = 'vm-map';
  else if (Inventory.activeIndex === 3) vm.className = 'vm-empty';
}

function setActiveSlot(index) {
  if (player.isMeditating || spellOverlay.style.display === 'flex' || grimoireMenu.style.display === 'flex' || mapOverlay.style.display === 'flex') return;
  Inventory.activeIndex = index;
  for (let i = 0; i <= 3; i++) {
    const slot = document.getElementById(`slot-${i}`);
    if (slot) {
      if (i === index) slot.classList.add('slot-active');
      else slot.classList.remove('slot-active');
    }
  }
  itemLog.textContent = `Equipado: ${Inventory.slots[index].name}`;
  updateViewModel();
}

export function updateLivePreview(queueStr) {
  document.getElementById('spell-sequence-display').textContent = queueStr || 'Vazia';
  if (!queueStr) {
    document.getElementById('preview-mana').textContent = '0';
    document.getElementById('preview-cd').textContent = '0ms';
    document.getElementById('preview-dmg').textContent = '0';
    document.getElementById('preview-type').textContent = 'Nenhum';
    document.getElementById('floating-spell-preview').style.boxShadow = 'none';
    return;
  }
  
  const stats = calculateSpellStats(queueStr, 1.0);
  document.getElementById('preview-mana').textContent = stats.manaCost;
  document.getElementById('preview-cd').textContent = stats.cooldown.toFixed(0) + 'ms';
  document.getElementById('preview-dmg').textContent = stats.damage.toFixed(1);
  
  let typeStr = "Aura (Self)";
  if (stats.isProj) typeStr = "Projétil (Arremessável)";
  if (stats.isBarrier) typeStr = "Barreira (Fixo)";
  document.getElementById('preview-type').textContent = typeStr;

  const floatPreview = document.getElementById('floating-spell-preview');
  floatPreview.style.boxShadow = `0 0 40px 20px ${stats.color}`;
  floatPreview.style.backgroundColor = stats.color;
}

function executeAction1() {
  if (player.isMeditating) return;
  if (gameState === 'PAUSED' && grimoireMenu.style.display !== 'flex' && mapOverlay.style.display !== 'flex') return;
  if (grimoireMenu.style.display === 'flex' || mapOverlay.style.display === 'flex') { toggleUI(false); return; }

  switch(Inventory.activeIndex) {
    case 0: toggleSpellMode(); break; // Spellbook
    case 1: toggleUI('grimoire'); updateGrimoireView(); break; // Grimoire
    case 2: // Map
      toggleUI('map'); 
      mapZoom = 1.8;
      mapOffsetX = (mapCanvas.clientWidth / 2) - (player.x * mapZoom);
      mapOffsetY = (mapCanvas.clientHeight / 2) - (player.y * mapZoom);
      renderWorldMap(); 
      break;
    case 3: // Empty Hand
      spellLog.textContent = "Mão vazia. Nenhuma ação."; spellLog.style.color = "#aaa"; 
      break;
  }
}

function executeAction2() {
  if (player.isMeditating) return;
  if (gameState === 'PAUSED') return;

  if (spellOverlay.style.display === 'flex') {
    appendCurrentRune(true); 
    return;
  }

  if (globalCooldown > 0) {
    spellLog.textContent = "Em Recarga..."; 
    spellLog.style.color = "#ffaa00";
    return;
  }

  switch(Inventory.activeIndex) {
    case 0: // Spellbook Shoot
      if (!cacheSpell || cacheSpell.spellId === 'Falha' || cacheSpell.spellId === '') {
        spellLog.textContent = "Cache Mágico Vazio ou Inválido!"; spellLog.style.color = "#ff5500";
        return;
      }
      let cd = spawnProjectile(player, cacheSpell);
      if (cd) globalCooldown = cd;
      spellLog.textContent = `Disparo: ${cacheSpell.spellId}`;
      spellLog.style.color = "#a0f";
      break;
    default:
      spellLog.textContent = "Sem ação secundária no item atual."; spellLog.style.color = "#aaa";
      break;
  }
}

function toggleUI(menu) {
  if (player.isMeditating && menu) return; // Impede abrir menus meditando
  grimoireMenu.style.display = 'none';
  mapOverlay.style.display = 'none';
  pauseMenu.style.display = 'none';

  if (!menu) {
    gameState = 'PLAYING';
    lastTime = performance.now();
  } else {
    gameState = 'PAUSED';
    if (menu === 'grimoire') grimoireMenu.style.display = 'flex';
    if (menu === 'map') mapOverlay.style.display = 'flex';
    if (menu === 'pause') pauseMenu.style.display = 'flex';
  }
}

// LÓGICA DO MAPA TÁTICO
function getDiffColor(diff) {
  if (diff < 25) return '#0f0';
  if (diff < 50) return '#ff0';
  if (diff < 75) return '#f80';
  return '#f00';
}

function renderWorldMap() {
  const ctx = mapCanvas.getContext('2d');
  mapCanvas.width = mapCanvas.clientWidth;
  mapCanvas.height = mapCanvas.clientHeight;
  
  ctx.fillStyle = '#050505';
  ctx.fillRect(0,0,mapCanvas.width, mapCanvas.height);

  ctx.save();
  ctx.translate(mapOffsetX, mapOffsetY);
  ctx.scale(mapZoom, mapZoom);

  // Grid
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1 / mapZoom;
  for(let i=0; i<=WORLD_SIZE; i+=50) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i); ctx.stroke();
  }

  let remaining = 0;
  SceneManager.dungeonsList.forEach(d => {
    if (!d.cleared) remaining++;
    
    ctx.fillStyle = d.cleared ? '#222' : getDiffColor(d.difficulty);
    ctx.fillRect(d.x - 2, d.y - 2, 4, 4);

    if (d.cleared) {
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1 / mapZoom;
      ctx.beginPath();
      ctx.moveTo(d.x - 2, d.y - 2); ctx.lineTo(d.x + 2, d.y + 2);
      ctx.moveTo(d.x + 2, d.y - 2); ctx.lineTo(d.x - 2, d.y + 2);
      ctx.stroke();
    }

    if (beaconTarget && beaconTarget.x === d.x && beaconTarget.y === d.y) {
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1.5 / mapZoom;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 6, 0, Math.PI*2);
      ctx.stroke();
    }
  });
  
  document.getElementById('map-total-dungeons').textContent = remaining;

  // Render Player no Overworld
  if (!SceneManager.isDungeon) {
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.arc(player.x, player.y, 15, (player.angle - 30) * Math.PI/180, (player.angle + 30) * Math.PI/180);
    ctx.fill();
  }

  ctx.restore();
}

mapCanvas.addEventListener('mousedown', (e) => {
  if (e.button === 0 || e.button === 1) { 
    isDraggingMap = true;
    dragStartX = e.clientX - mapOffsetX;
    dragStartY = e.clientY - mapOffsetY;
  }
});

mapCanvas.addEventListener('mousemove', (e) => {
  if (isDraggingMap) {
    mapOffsetX = e.clientX - dragStartX;
    mapOffsetY = e.clientY - dragStartY;
    renderWorldMap();
  }

  const rect = mapCanvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const worldX = (mouseX - mapOffsetX) / mapZoom;
  const worldY = (mouseY - mapOffsetY) / mapZoom;

  document.getElementById('map-coord-x').textContent = Math.floor(worldX);
  document.getElementById('map-coord-y').textContent = Math.floor(worldY);

  let hoverDiff = "--";
  let color = "#fff";
  SceneManager.dungeonsList.forEach(d => {
    if (Math.hypot(d.x - worldX, d.y - worldY) < 4) {
      hoverDiff = d.difficulty;
      color = getDiffColor(d.difficulty);
    }
  });
  const diffEl = document.getElementById('map-hover-diff');
  diffEl.textContent = hoverDiff;
  diffEl.style.color = color;
});

mapCanvas.addEventListener('mouseup', () => { isDraggingMap = false; });
mapCanvas.addEventListener('mouseleave', () => { isDraggingMap = false; });

mapCanvas.addEventListener('contextmenu', (e) => {
  e.preventDefault(); 
  const rect = mapCanvas.getBoundingClientRect();
  const worldX = ((e.clientX - rect.left) - mapOffsetX) / mapZoom;
  const worldY = ((e.clientY - rect.top) - mapOffsetY) / mapZoom;
  
  SceneManager.dungeonsList.forEach(d => {
    if (Math.hypot(d.x - worldX, d.y - worldY) < 5) {
      d.cleared = !d.cleared; 
      if (d.cleared && beaconTarget && beaconTarget.x === d.x && beaconTarget.y === d.y) beaconTarget = null;
      renderWorldMap();
    }
  });
});

mapCanvas.addEventListener('click', (e) => {
  if (isDraggingMap) return; 
  const rect = mapCanvas.getBoundingClientRect();
  const worldX = ((e.clientX - rect.left) - mapOffsetX) / mapZoom;
  const worldY = ((e.clientY - rect.top) - mapOffsetY) / mapZoom;
  
  let closest = null; let minDist = Infinity;
  SceneManager.dungeonsList.forEach(d => {
    let dist = Math.hypot(d.x - worldX, d.y - worldY);
    if (dist < 5 && dist < minDist) { minDist = dist; closest = d; }
  });
  if (closest && !closest.cleared) {
    beaconTarget = { x: closest.x, y: closest.y };
  } else if (!closest) {
    beaconTarget = null; 
  }
  renderWorldMap();
});

document.getElementById('map-zoom-in')?.addEventListener('click', () => { mapZoom = Math.min(mapZoom + 0.5, 4.0); renderWorldMap(); });
document.getElementById('map-zoom-out')?.addEventListener('click', () => { mapZoom = Math.max(mapZoom - 0.5, 0.5); renderWorldMap(); });

// Controle de Interações e Hotkeys
document.getElementById('menu-btn')?.addEventListener('click', () => toggleUI('pause'));
document.getElementById('resume-btn')?.addEventListener('click', () => toggleUI(false));
document.getElementById('close-grimoire-btn')?.addEventListener('click', () => toggleUI(false));
document.getElementById('close-map-btn')?.addEventListener('click', () => toggleUI(false));
document.getElementById('action1-btn')?.addEventListener('click', executeAction1);
document.getElementById('action2-btn')?.addEventListener('click', executeAction2);
document.getElementById('undo-spell-btn')?.addEventListener('click', () => { undoLastRune(); });

for (let i = 0; i <= 3; i++) {
  document.getElementById(`slot-${i}`)?.addEventListener('click', () => setActiveSlot(i));
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (gameState === 'PLAYING') toggleUI('pause'); else toggleUI(false);
  }

  // Hotbar Direta
  if (e.key === '1') setActiveSlot(0); // Caderno
  if (e.key === '2') setActiveSlot(1); // Grimório
  if (e.key === '3') setActiveSlot(2); // Mapa
  if (e.key === '0') setActiveSlot(3); // Mão Vazia

  // Ações de Mapa Rápidas
  if (e.key.toLowerCase() === 'm' && gameState === 'PLAYING') {
    setActiveSlot(2);
    executeAction1();
  }

  // Meditação
  if (e.key.toLowerCase() === 'r' && gameState === 'PLAYING') {
    player.isMeditating = !player.isMeditating;
    document.getElementById('meditate-log').style.display = player.isMeditating ? 'block' : 'none';
  }

  // Cycle Hotbar
  if (e.key === 'ArrowUp') {
    let next = Inventory.activeIndex - 1;
    if (next < 0) next = Inventory.slots.length - 1;
    setActiveSlot(next);
  }
  if (e.key === 'ArrowDown') {
    let next = (Inventory.activeIndex + 1) % Inventory.slots.length;
    setActiveSlot(next);
  }

  if (e.key.toLowerCase() === 'q' || e.key === ' ') { e.preventDefault(); executeAction1(); }
  if (e.key.toLowerCase() === 'e' || e.key === 'Enter') { e.preventDefault(); executeAction2(); }
});

onSpellCast((spellResult) => {
  if (!spellResult || spellResult.spellId === 'Falha') {
    spellLog.textContent = "Magia: Falha no traço"; spellLog.style.color = "#f00";
    return;
  }
  
  spellLog.textContent = `Feitiço: ${spellResult.spellId} (${spellResult.accuracy}%)`;
  spellLog.style.color = "#0ff";
  cacheSpell = spellResult; 
  recastLog.textContent = `Recast: ${cacheSpell.spellId}`;
  
  let cd = spawnProjectile(player, spellResult); 
  if (cd) globalCooldown = cd;
});

document.addEventListener('click', (e) => {
  if (e.target && e.target.classList.contains('guide-btn')) {
    window.activeWatermark = e.target.getAttribute('data-rune');
    toggleUI(false);
    toggleSpellMode();
  }
});

function processProjectileCollisions() {
  activeProjectiles.forEach(p => {
    let px = Math.floor(p.x);
    let py = Math.floor(p.y);
    if (SceneManager.activeMap[py] && SceneManager.activeMap[py][px] >= 4) {
      let blockType = SceneManager.activeMap[py][px];
      SceneManager.activeMap[py][px] = 0; 
      
      let coinsDrop = blockType === 5 ? 25 : 2;
      player.coins += coinsDrop;
      document.getElementById('coin-counter').textContent = player.coins;
      
      if(blockType === 5 && SceneManager.isDungeon) {
        SceneManager.dungeonData.foundChests++;
        SceneManager.updateDungeonHUD();
      }
      p.life = 0; 
    }
  });
}

function gameLoop(timestamp) {
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 100) deltaTime = 16;

  if (gameState !== 'PAUSED') {
    if (globalCooldown > 0) globalCooldown -= deltaTime;
    if (portalCooldown > 0) portalCooldown -= deltaTime;

    updatePlayer(deltaTime, timeScale, SceneManager.activeMap);
    updateProjectiles(deltaTime, timeScale, SceneManager.activeMap);
    processProjectileCollisions();

    // Bússola Direcional (Beacon)
    if (beaconTarget && !SceneManager.isDungeon) {
      let dx = beaconTarget.x - player.x;
      let dy = beaconTarget.y - player.y;
      let dist = Math.hypot(dx, dy);
      
      document.getElementById('compass-container').style.display = 'flex';
      document.getElementById('beacon-distance').textContent = Math.floor(dist);

      let targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      let relativeAngle = targetAngle - player.angle;
      
      let arrowRotation = relativeAngle + 90;
      document.getElementById('compass-arrow').style.transform = `rotate(${arrowRotation}deg)`;
    } else {
      document.getElementById('compass-container').style.display = 'none';
    }

    if (portalCooldown <= 0) {
      let px = Math.floor(player.x); let py = Math.floor(player.y);
      for(let dy=-1; dy<=1; dy++) {
        for(let dx=-1; dx<=1; dx++) {
          let ty = py+dy, tx = px+dx;
          if(SceneManager.activeMap[ty] && SceneManager.activeMap[ty][tx] > 1 && SceneManager.activeMap[ty][tx] < 4) {
            let dist = Math.hypot(player.x - (tx+0.5), player.y - (ty+0.5));
            if(dist < 0.8) {
              if(SceneManager.activeMap[ty][tx] === 2) { SceneManager.enterPortal('down', tx, ty); portalCooldown = 1500; }
              else if(SceneManager.activeMap[ty][tx] === 3) { SceneManager.enterPortal('up', tx, ty); portalCooldown = 1500; }
            }
          }
        }
      }
    }
  }
  
  castRays(SceneManager.activeMap);
  requestAnimationFrame(gameLoop);
}

setActiveSlot(3); // Inicia sempre com a mão vazia
requestAnimationFrame(gameLoop);
