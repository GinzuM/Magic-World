import { compileSpell, Templates } from './spellbook.js';
import { Inventory } from '../main.js';

export const captureState = {
  isDrawing: false,
  strokePath: []
};

let accumulatedRunes = [];
let accumulatedAccuracies = [];
let spellCallback = null;

const canvas = document.getElementById('spell-canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('spell-overlay');
const seqDisplay = document.getElementById('spell-sequence-display');

export function onSpellCast(callback) {
  spellCallback = callback;
}

function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

function drawWatermark() {
  if (!window.activeWatermark || !Templates[window.activeWatermark]) return;
  
  const templatePoints = Templates[window.activeWatermark];
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 170, 0, 0.4)'; 
  ctx.lineWidth = 15; 
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([20, 15]); 
  ctx.beginPath();
  
  for (let i = 0; i < templatePoints.length; i++) {
    const pt = templatePoints[i];
    const canvasX = (pt.x / 100) * canvas.width;
    const canvasY = (pt.y / 100) * canvas.height;
    if (i === 0) ctx.moveTo(canvasX, canvasY);
    else ctx.lineTo(canvasX, canvasY);
  }
  ctx.stroke();
  ctx.restore();
}

export function toggleSpellMode() {
  if (overlay.style.display === 'flex') {
    overlay.style.display = 'none';
    return 1.0;
  } else {
    if (Inventory.activeIndex !== 0) return 1.0; 
    
    overlay.style.display = 'flex';
    resizeCanvasToDisplaySize();
    
    accumulatedRunes = [];
    accumulatedAccuracies = [];
    seqDisplay.textContent = "Fila: Vazia";
    seqDisplay.style.color = "#0ff";
    
    clearCanvasWithWatermark();
    return 0.2;
  }
}

function clearCanvasWithWatermark() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWatermark();
  captureState.strokePath = [];
}

function getNormalizedCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

canvas.addEventListener('pointerdown', e => {
  captureState.isDrawing = true;
  const pos = getNormalizedCoordinates(e);
  captureState.strokePath.push(pos);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener('pointermove', e => {
  if (!captureState.isDrawing) return;
  const pos = getNormalizedCoordinates(e);
  captureState.strokePath.push(pos);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]); 
  ctx.stroke();
});

canvas.addEventListener('pointerup', () => captureState.isDrawing = false);
canvas.addEventListener('pointerleave', () => captureState.isDrawing = false);

export function appendCurrentRune(shouldFinalize = false) {
  if (captureState.strokePath.length < 2) {
    if (shouldFinalize) finalizeWholeSpell();
    return;
  }

  const result = compileSpell(captureState.strokePath);
  
  if (result && result.spellId !== 'Falha') {
    accumulatedRunes.push(result.spellId);
    accumulatedAccuracies.push(parseFloat(result.accuracy));
    seqDisplay.textContent = `Fila: ${accumulatedRunes.join(' ')}`;
    seqDisplay.style.color = "#0ff";
  } else {
    seqDisplay.textContent = "Runa Rejeitada!";
    seqDisplay.style.color = "#f00";
  }

  window.activeWatermark = null; 
  clearCanvasWithWatermark();

  if (shouldFinalize) {
    setTimeout(finalizeWholeSpell, 50);
  }
}

function finalizeWholeSpell() {
  if (accumulatedRunes.length === 0) {
    toggleSpellMode();
    return;
  }

  const finalString = accumulatedRunes.join('');
  const avgAccuracy = (accumulatedAccuracies.reduce((a, b) => a + b, 0) / accumulatedAccuracies.length).toFixed(0);

  if (spellCallback) spellCallback({ spellId: finalString, accuracy: avgAccuracy });
  toggleSpellMode();
}

document.getElementById('add-spell-btn')?.addEventListener('click', () => appendCurrentRune(false));
document.getElementById('cast-spell-btn')?.addEventListener('click', () => appendCurrentRune(true));
document.getElementById('close-spell-btn')?.addEventListener('click', toggleSpellMode);
