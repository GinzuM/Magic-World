import { compileSpell } from './spellbook.js';
import { Inventory } from '../main.js';

export const captureState = {
  isDrawing: false,
  strokePath: []
};

let spellCallback = null;
const canvas = document.getElementById('spell-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('spell-overlay');

export function onSpellCast(callback) {
  spellCallback = callback;
}

// Sincroniza a resolução interna de pixels com o tamanho CSS real da tela
function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

export function toggleSpellMode() {
  if (overlay.style.display === 'flex') {
    overlay.style.display = 'none';
    return 1.0;
  } else {
    if (Inventory.activeIndex !== 0) {
      document.getElementById('spell-log').textContent = "Equipe o Caderno de Magias!";
      document.getElementById('spell-log').style.color = "#ffaa00";
      return 1.0; 
    }
    
    overlay.style.display = 'flex';
    resizeCanvasToDisplaySize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    captureState.strokePath = [];
    return 0.2;
  }
}

function getNormalizedCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // Mapeia a posição do clique diretamente na proporção interna do canvas reconstruído
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  return { x, y };
}

function startDraw(e) {
  captureState.isDrawing = true;
  const pos = getNormalizedCoordinates(e);
  captureState.strokePath.push(pos);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!captureState.isDrawing) return;
  const pos = getNormalizedCoordinates(e);
  captureState.strokePath.push(pos);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function endDraw() {
  captureState.isDrawing = false;
}

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);

// Método de compilação manual invocado pelo botão ou por tecla de gatilho externa
export function executeCompiledStroke() {
  if (captureState.strokePath.length < 2) {
    toggleSpellMode();
    return;
  }

  const result = compileSpell(captureState.strokePath);
  if (spellCallback) spellCallback(result);
  toggleSpellMode();
}

document.getElementById('cast-spell-btn')?.addEventListener('click', executeCompiledStroke);
document.getElementById('close-spell-btn')?.addEventListener('click', toggleSpellMode);
