export const SpellRegistry = {
  'A': { id: 'A', name: 'Ignis', type: 'fire', baseDamage: 50 },
  'E': { id: 'E', name: 'Terra', type: 'earth', baseDamage: 40 },
  'I': { id: 'I', name: 'Fulgur', type: 'lightning', baseDamage: 60 },
  'O': { id: 'O', name: 'Aegis', type: 'shield', baseDamage: 0 },
  'U': { id: 'U', name: 'Aqua', type: 'water', baseDamage: 30 }
};

const NUM_POINTS = 64;
const SQUARE_SIZE = 100;

// Geradores de Geometria Unistroke
const rawTemplates = {
  'A': [{x: 10, y: 90}, {x: 50, y: 10}, {x: 90, y: 90}],
  'E': [{x: 90, y: 10}, {x: 10, y: 10}, {x: 10, y: 50}, {x: 60, y: 50}, {x: 10, y: 50}, {x: 10, y: 90}, {x: 90, y: 90}],
  'I': [{x: 50, y: 10}, {x: 50, y: 90}],
  'U': [{x: 10, y: 10}, {x: 10, y: 80}, {x: 30, y: 90}, {x: 70, y: 90}, {x: 90, y: 80}, {x: 90, y: 10}]
};

const Templates = {};

// Compila os arrays brutos na mesma pipeline do jogador
function compileTemplate(points) {
  let resampled = resample(points, NUM_POINTS);
  const bounds = calculateBoundingBox(resampled);
  resampled = scaleTo(resampled, SQUARE_SIZE, bounds);
  const scaledBounds = calculateBoundingBox(resampled);
  return translateToOrigin(resampled, scaledBounds);
}

// Inicializa os templates na memória
for (const [key, path] of Object.entries(rawTemplates)) {
  Templates[key] = compileTemplate(path);
}

// O círculo 'O' usa equação paramétrica para ser perfeito
let circlePoints = [];
for (let i = 0; i < NUM_POINTS; i++) {
  const angle = (i / NUM_POINTS) * Math.PI * 2;
  circlePoints.push({ x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) });
}
Templates['O'] = compileTemplate(circlePoints);


export function compileSpell(strokePath) {
  if (!strokePath || strokePath.length < 2) return null;

  let points = resample(strokePath, NUM_POINTS);
  const bounds = calculateBoundingBox(points);
  points = scaleTo(points, SQUARE_SIZE, bounds);
  const scaledBounds = calculateBoundingBox(points);
  points = translateToOrigin(points, scaledBounds);

  return recognize(points);
}

function recognize(points) {
  let bestMatch = 'Falha';
  let bestScore = Infinity; 

  for (const [id, templatePoints] of Object.entries(Templates)) {
    let d = pathDistance(points, templatePoints);
    if (d < bestScore) {
      bestScore = d;
      bestMatch = id;
    }
  }

  // O threshold define a rigidez da correção. 45 permite maior tolerância geométrica.
  const threshold = 45; 
  const score = Math.max(0, 1.0 - (bestScore / threshold));

  return { 
    spellId: score > 0.45 ? bestMatch : 'Falha', 
    accuracy: (score * 100).toFixed(0) 
  };
}

function pathDistance(pts1, pts2) {
  let d = 0;
  for (let i = 0; i < pts1.length; i++) {
    d += distance(pts1[i], pts2[i]);
  }
  return d / pts1.length;
}

function resample(points, n) {
  const I = pathLength(points) / (n - 1);
  let D = 0;
  let newPoints = [{ x: points[0].x, y: points[0].y }];
  let tempPoints = [...points];

  for (let i = 1; i < tempPoints.length; i++) {
    let p1 = tempPoints[i - 1];
    let p2 = tempPoints[i];
    let d = distance(p1, p2);
    
    if (D + d >= I) {
      let qx = p1.x + ((I - D) / d) * (p2.x - p1.x);
      let qy = p1.y + ((I - D) / d) * (p2.y - p1.y);
      let q = { x: qx, y: qy };
      newPoints.push(q);
      tempPoints.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }
  
  while (newPoints.length < n) {
    newPoints.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
  }
  return newPoints;
}

function distance(p1, p2) {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function pathLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function calculateBoundingBox(path) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < path.length; i++) {
    minX = Math.min(minX, path[i].x);
    maxX = Math.max(maxX, path[i].x);
    minY = Math.min(minY, path[i].y);
    maxY = Math.max(maxY, path[i].y);
  }
  return { minX, maxX, minY, maxY };
}

function scaleTo(points, size, bounds) {
  let scaled = [];
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  for (let i = 0; i < points.length; i++) {
    scaled.push({
      x: points[i].x * (size / width),
      y: points[i].y * (size / height)
    });
  }
  return scaled;
}

function translateToOrigin(points, bounds) {
  let translated = [];
  for (let i = 0; i < points.length; i++) {
    translated.push({
      x: points[i].x - bounds.minX,
      y: points[i].y - bounds.minY
    });
  }
  return translated;
}
