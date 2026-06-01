import { compileSpell } from './spellbook.js';
import { Inventory } from '../main.js';

export const captureState = {
  isDrawing: false,
  strokePath: []
};

let spellBuffer = [];
let spellAccuracies = [];
let bufferTimer = null;
let lastCast = null;
let spellCallback = null;

const canvas = document.getElementById('spell-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('spell-overlay');

export function onSpellCast(callback) {
  spellCallback = callback;
}

function clearBuffer() {
  spellBuffer = [];
  spellAccuracies = [];
  if (bufferTimer) {
    clearTimeout(bufferTimer);
    bufferTimer = null;
  }
}

export function toggleSpellMode() {
  if (overlay.style.display === 'flex') {
    overlay.style.display = 'none';
    clearBuffer();
    return 1.0;
  } else {
    if (Inventory.activeIndex !== 0) {
      console.warn("Acesso negado: Caderno de Magias não está equipado.");
      document.getElementById('spell-log').textContent = "Equipe o Caderno de Magias!";
      document.getElementById('spell-log').style.color = "#ffaa00";
      return 1.0; 
    }
    
    overlay.style.display = 'flex';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    captureState.strokePath = [];
    clearBuffer();
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
  if (bufferTimer) clearTimeout(bufferTimer);
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
  if (!captureState.isDrawing) return;
  captureState.isDrawing = false;
  
  const result = compileSpell(captureState.strokePath);
  
  // Limpa o canvas para o próximo caractere independentemente do resultado
  captureState.strokePath = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (result && result.spellId !== 'Falha') {
    spellBuffer.push(result.spellId);
    spellAccuracies.push(parseFloat(result.accuracy));
  }
  
  // Inicia a janela de tolerância para o próximo traço (1.2 segundos)
  bufferTimer = setTimeout(finalizeSpell, 1200);
}

canvas.addEventListener('pointerdown', startDraw);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointerleave', endDraw);

function finalizeSpell() {
  if (spellBuffer.length === 0) {
    toggleSpellMode();
    return;
  }
  
  const finalSpellId = spellBuffer.join('');
  const avgAccuracy = (spellAccuracies.reduce((a, b) => a + b, 0) / spellAccuracies.length).toFixed(0);
  
  const finalResult = { spellId: finalSpellId, accuracy: avgAccuracy };
  lastCast = finalResult;
  
  if (spellCallback) spellCallback(finalResult);
  clearBuffer();
  toggleSpellMode();
}

document.getElementById('cast-spell-btn')?.addEventListener('click', () => {
  if (bufferTimer) clearTimeout(bufferTimer);
  finalizeSpell();
});

document.getElementById('recast-spell-btn')?.addEventListener('click', () => {
  if (!lastCast) {
    console.log("Nenhuma magia armazenada no cache.");
    return;
  }
  if (spellCallback) spellCallback(lastCast);
  toggleSpellMode();
});
