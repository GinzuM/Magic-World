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
    { id: 'empty', name: 'Mão Vazia' },
    { id: 'map', name: 'Mapa Tático Global' }
  ],
  activeIndex: 0
};

player.coins = 0;

// Geração de Mundo e Dungeons
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
  
  const numRuins = 400; 
  const dungeonsList = [];
  
  for (let i = 0; i < numRuins; i++) {
    let rx = Math.floor(Math.random() * (size - 20)) + 10;
    let ry = Math.floor(Math.random() * (size - 20)) + 10;
    if(rx < 15 && ry < 15) continue; 
    
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
      
      // Geração de Caixas(4) e Baús(5)
      let rand = Math.random() * 100;
      if(rand < 3) map[y][x] = 4; // 3% de chance de caixa (bloqueio)
      else if(rand < 3.5 && chests < 2) { map[y][x] = 5; chests++; } // Max 2 baús
    }
    let dir = Math.floor(Math.random() * 4);
    if(dir === 0 && x < size - 2) x++;
    else if(dir === 1 && x > 1) x--;
    else if(dir === 2 && y < size - 2) y++;
    else if(dir === 3 && y > 1) y--;
  }
  
  map[Math.floor(size/2)][Math.floor(size/2)] = 3; // Portal de Subir (Saída)
  map[y][x] = 2; // Portal de Descer
  
  return { map, chests };
}

const worldData = generateOverworld(1000);

export const SceneManager = {
  isDungeon: false,
  overworldMap: worldData.map,
  dungeonsList: worldData.dungeonsList,
  currentDungeonRef: null,
  dungeonData: { floors: [], currentFloor: 0, maxFloors: 0, totalChests: 0, foundChests: 0 },
  savedOverworldCoords: { x: 5.5, y: 5.5 },
  activeMap: worldData.map,
  
  enterPortal: function(type, px, py) {
    if (!this.isDungeon) {
      // Procurando a referência da dungeon no mundo
      this.currentDungeonRef = this.dungeonsList.find(d => Math.abs(d.x - px) < 2 && Math.abs(d.y - py) < 2);
      if(!this.currentDungeonRef) return;

      this.savedOverworldCoords = { x: player.x, y: player.y };
      this.isDungeon = true;
      this.dungeonData.maxFloors = this.currentDungeonRef.maxFloors;
      this.dungeonData.currentFloor = this.currentDungeonRef.maxFloors; // Inverte o andar inicial
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
      if (type === 'down') { // Vai para um andar menor
        this.dungeonData.currentFloor--;
        if (this.dungeonData.currentFloor < 1) this.dungeonData.currentFloor = 1;
        this.loadFloor();
      } else if (type === 'up') { // Vai para um andar maior
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

let lastTime = performance.now();
let timeScale = 1.0;
let cacheSpell = null; 
let globalCooldown = 0;
let portalCooldown = 0;
let beaconTarget = null;

// UI Elements
const pauseMenu = document.getElementById('pause-menu');
const grimoireMenu = document.getElementById('grimoire-overlay');
const spellOverlay = document.getElementById('spell-overlay');
const mapOverlay = document.getElementById('map-overlay');
const spellLog = document.getElementById('spell-log');
const recastLog = document.getElementById('recast-log');
const itemLog = document.getElementById('item-log');

// Grimoire Pagination Logic
const grimEntries = Object.values(SpellRegistry).sort((a,b) => a.id.localeCompare(b.id));
let grimPage = 0;

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

// Viewmodel Controller
function updateViewModel() {
  const vm = document.getElementById('vm-sprite');
  vm.className = '';
  if (Inventory.activeIndex === 0) vm.className = 'vm-book';
  else if (Inventory.activeIndex === 1) vm.className = 'vm-grimoire';
  else if (Inventory.activeIndex === 3) vm.className = 'vm-map';
}

function setActiveSlot(index) {
  if (spellOverlay.style.display === 'flex' || grimoireMenu.style.display === 'flex' || mapOverlay.style.display === 'flex') return;
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
    document.getElementById('preview-cd').textContent = '0';
    document.getElementById('preview-dmg').textContent = '0';
    document.getElementById('preview-type').textContent = 'Nenhum';
    document.getElementById('floating-spell-preview').style.boxShadow = 'none';
    return;
  }
  
  const stats = calculateSpellStats(queueStr, 1.0);
  document.getElementById('preview-mana').textContent = stats.manaCost;
  document.getElementById('preview-cd').textContent = stats.cooldown.toFixed(0);
  document.getElementById('preview-dmg').textContent = stats.damage.toFixed(1);
  
  let typeStr = "Aura";
  if (stats.isProj) typeStr = "Projétil";
  if (stats.isBarrier) typeStr = "Barreira";
  document.getElementById('preview-type').textContent = typeStr;

  const floatPreview = document.getElementById('floating-spell-preview');
  floatPreview.style.boxShadow = `0 0 30px 15px ${stats.color}`;
  floatPreview.style.backgroundColor = stats.color;
}

// Interações Primárias e Secundárias
function executeAction1() {
  if (gameState === 'PAUSED' && grimoireMenu.style.display !== 'flex' && mapOverlay.style.display !== 'flex') return;
  if (grimoireMenu.style.display === 'flex' || mapOverlay.style.display === 'flex') { toggleUI(false); return; }

  switch(Inventory.activeIndex) {
    case 0: toggleSpellMode(); break;
    case 1: toggleUI('grimoire'); updateGrimoireView(); break;
    case 2: spellLog.textContent = "Mão vazia. Nenhuma ação."; spellLog.style.color = "#aaa"; break;
    case 3: toggleUI('map'); renderWorldMap(); break;
  }
}

function executeAction2() {
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
    default:
      spellLog.textContent = "Sem ação secundária no item atual."; spellLog.style.color = "#aaa";
      break;
  }
}

function toggleUI(menu) {
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

function renderWorldMap() {
  const c = document.getElementById('world-map-canvas');
  const ctx = c.getContext('2d');
  c.width = 1000; c.height = 1000;
  
  ctx.fillStyle = '#050505';
  ctx.fillRect(0,0,1000,1000);

  let remaining = 0;
  SceneManager.dungeonsList.forEach(d => {
    if (!d.cleared) remaining++;
    ctx.fillStyle = d.cleared ? '#333' : `hsl(${120 - (d.difficulty * 1.2)}, 100%, 50%)`;
    ctx.fillRect(d.x - 5, d.y - 5, 10, 10);
  });
  
  document.getElementById('map-total-dungeons').textContent = remaining;

  // Render Player
  if (!SceneManager.isDungeon) {
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 8, 0, Math.PI*2);
    ctx.fill();
  }

  // Clicar no mapa para setar beacon
  c.onclick = (e) => {
    const rect = c.getBoundingClientRect();
    const scaleX = c.width / rect.width;
    const scaleY = c.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    let closest = null; let minDist = Infinity;
    SceneManager.dungeonsList.forEach(d => {
      let dist = Math.hypot(d.x - clickX, d.y - clickY);
      if (dist < 40 && dist < minDist) { minDist = dist; closest = d; }
    });
    if (closest) beaconTarget = { x: closest.x, y: closest.y };
  };
}

// Binds
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
  if (e.key >= '1' && e.key <= '4') setActiveSlot(parseInt(e.key) - 1);
  if (e.key.toLowerCase() === 'e') { e.preventDefault(); executeAction1(); }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); executeAction2(); }
});

// Callback da captura mágica concluída
onSpellCast((spellResult) => {
  if (!spellResult || spellResult.spellId === 'Falha') {
    spellLog.textContent = "Magia: Falha no traço"; spellLog.style.color = "#f00";
    return;
  }
  if (globalCooldown > 0) {
    spellLog.textContent = "Em Recarga..."; spellLog.style.color = "#ffaa00";
    return;
  }

  spellLog.textContent = `Feitiço: ${spellResult.spellId} (${spellResult.accuracy}%)`;
  spellLog.style.color = "#0ff";
  cacheSpell = spellResult; 
  recastLog.textContent = `Recast: ${cacheSpell.spellId}`;
  
  let cd = spawnProjectile(player, spellResult); 
  if (cd) globalCooldown = cd;
});

// Ações do Grimoire para ir pro modo Prática
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
      SceneManager.activeMap[py][px] = 0; // Quebra o bloco
      
      let coinsDrop = blockType === 5 ? 25 : 2;
      player.coins += coinsDrop;
      document.getElementById('coin-counter').textContent = player.coins;
      
      if(blockType === 5 && SceneManager.isDungeon) {
        SceneManager.dungeonData.foundChests++;
        SceneManager.updateDungeonHUD();
      }
      p.life = 0; // Destrói o projétil ao impactar
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

    // Beacon Logic
    if (beaconTarget && !SceneManager.isDungeon) {
      let dist = Math.hypot(player.x - beaconTarget.x, player.y - beaconTarget.y);
      document.getElementById('beacon-indicator').style.display = 'block';
      document.getElementById('beacon-distance').textContent = Math.floor(dist);
    } else {
      document.getElementById('beacon-indicator').style.display = 'none';
    }

    // Portals Collision Logic
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

setActiveSlot(0);
requestAnimationFrame(gameLoop);
