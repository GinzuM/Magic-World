import { compileSpell, Templates } from './spellbook.js';
import { Inventory, updateLivePreview } from '../main.js';

export const captureState = {
  isDrawing: false,
  strokePath: []
};

// A fila agora é mantida globalmente até a magia ser conjurada
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

export function getSpellQueue() {
  return accumulatedRunes.join('');
}

function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  if (canvas.width !== rect.width || canvas.height !== rect.height) {
    canvas.width = rect.width;
    canvas.height = rect.height;
  }
}

function updateUI() {
  const seqStr = accumulatedRunes.join('');
  updateLivePreview(seqStr);
}

function drawWatermark() {
  if (!window.activeWatermark || !Templates[window.activeWatermark]) return;
  
  const templatePoints = Templates[window.activeWatermark];
  ctx.save();
  ctx.strokeStyle = 'rgba(184, 153, 98, 0.4)'; 
  ctx.lineWidth = 12; 
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(184, 153, 98, 0.8)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  
  const padding = 0.20; 
  const drawAreaWidth = canvas.width * (1 - padding * 2);
  const drawAreaHeight = canvas.height * (1 - padding * 2);
  const offsetX = canvas.width * padding;
  const offsetY = canvas.height * padding;

  for (let i = 0; i < templatePoints.length; i++) {
    const pt = templatePoints[i];
    const canvasX = offsetX + (pt.x / 100) * drawAreaWidth;
    const canvasY = offsetY + (pt.y / 100) * drawAreaHeight;
    
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
    
    // Atualiza a UI para refletir o estado do cache atual sem apagar
    updateUI();
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
  ctx.stroke();
});

canvas.addEventListener('pointerup', () => captureState.isDrawing = false);
canvas.addEventListener('pointerleave', () => captureState.isDrawing = false);

export function undoLastRune() {
  if (accumulatedRunes.length > 0) {
    accumulatedRunes.pop();
    accumulatedAccuracies.pop();
    updateUI();
  }
}

export function appendCurrentRune(shouldFinalize = false) {
  if (captureState.strokePath.length < 2) {
    if (shouldFinalize) finalizeWholeSpell();
    return;
  }

  const result = compileSpell(captureState.strokePath);
  
  if (result && result.spellId !== 'Falha') {
    accumulatedRunes.push(result.spellId);
    accumulatedAccuracies.push(parseFloat(result.accuracy));
    updateUI();
  } else {
    seqDisplay.textContent = "Runa Rejeitada!";
    seqDisplay.style.color = "#f00";
    setTimeout(updateUI, 1000); // Restaura a fila após 1 segundo de erro
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
  
  // Limpa o cache após a execução com sucesso
  accumulatedRunes = [];
  accumulatedAccuracies = [];
  updateUI();

  toggleSpellMode();
}

document.getElementById('add-spell-btn')?.addEventListener('click', () => appendCurrentRune(false));
document.getElementById('cast-spell-btn')?.addEventListener('click', () => appendCurrentRune(true));
document.getElementById('close-spell-btn')?.addEventListener('click', toggleSpellMode);
