import { compileSpell } from './spellbook.js';

export const captureState = {
  isDrawing: false,
  strokePath: []
};

let lastCast = null;
let spellCallback = null;

const canvas = document.getElementById('spell-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('spell-overlay');

// Registra a função que o main.js usará para escutar as magias
export function onSpellCast(callback) {
  spellCallback = callback;
}

export function toggleSpellMode() {
  if (overlay.style.display === 'flex') {
    overlay.style.display = 'none';
    return 1.0;
  } else {
    overlay.style.display = 'flex';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    captureState.strokePath = [];
    return 0.2;
  }
}

function getNormalizedCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

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
  ctx.lineWidth = 4;
  ctx.stroke();
}

function endDraw() {
  captureState.isDrawing = false;
}

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);

// Conjuração normal
document.getElementById('cast-spell-btn')?.addEventListener('click', () => {
  const result = compileSpell(captureState.strokePath);
  
  if (result && result.spellId !== 'Falha') {
    lastCast = result; // Salva no cache
  }

  if (spellCallback) spellCallback(result);
  toggleSpellMode();
});

// Mecânica de Recast
document.getElementById('recast-spell-btn')?.addEventListener('click', () => {
  if (!lastCast) {
    console.log("Nenhuma magia armazenada no cache.");
    return;
  }
  
  // Ignora o canvas e envia o cache direto para o motor
  if (spellCallback) spellCallback(lastCast);
  toggleSpellMode();
});
