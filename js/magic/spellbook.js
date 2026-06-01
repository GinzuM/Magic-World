export const SpellRegistry = {
  'A': { id: 'A', name: 'Ignis' },
  'E': { id: 'E', name: 'Terra' },
  'I': { id: 'I', name: 'Fulgur' },
  'O': { id: 'O', name: 'Aegis' },
  'U': { id: 'U', name: 'Aqua' }
};

const NUM_POINTS = 64;
const SQUARE_SIZE = 100;

const rawTemplates = {
  'A': [{x: 20, y: 90}, {x: 50, y: 10}, {x: 80, y: 90}],
  'E': [{x: 80, y: 20}, {x: 20, y: 20}, {x: 20, y: 50}, {x: 60, y: 50}, {x: 20, y: 50}, {x: 20, y: 80}, {x: 80, y: 80}],
  'I': [{x: 50, y: 10}, {x: 50, y: 90}],
  'U': [{x: 20, y: 20}, {x: 20, y: 70}, {x: 40, y: 90}, {x: 60, y: 90}, {x: 80, y: 70}, {x: 80, y: 20}]
};

export const Templates = {};

// Processamento Geométrico Proporcional (Evita distorção de linhas finas como a letra 'I')
function processGesture(points) {
  let resampled = resample(points, NUM_POINTS);
  let bounds = calculateBoundingBox(resampled);
  resampled = scaleProportional(resampled, SQUARE_SIZE, bounds);
  bounds = calculateBoundingBox(resampled);
  resampled = translateToOrigin(resampled, bounds);
  bounds = calculateBoundingBox(resampled);
  return centerInSquare(resampled, SQUARE_SIZE, bounds);
}

for (const [key, path] of Object.entries(rawTemplates)) {
  Templates[key] = processGesture(path);
}

let circlePoints = [];
for (let i = 0; i < NUM_POINTS; i++) {
  const angle = (i / NUM_POINTS) * Math.PI * 2;
  circlePoints.push({ x: 50 + 50 * Math.cos(angle), y: 50 + 50 * Math.sin(angle) });
}
Templates['O'] = processGesture(circlePoints);

export function compileSpell(strokePath) {
  if (!strokePath || strokePath.length < 2) return null;

  const points = processGesture(strokePath);
  return recognize(points);
}

function recognize(points) {
  let bestMatch = 'Falha';
  let bestScore = Infinity; 

  for (const [id, templatePoints] of Object.entries(Templates)) {
    const isClosed = (id === 'O');
    let d = pathDistance(points, templatePoints, isClosed);
    if (d < bestScore) {
      bestScore = d;
      bestMatch = id;
    }
  }

  // O threshold foi ampliado porque a escala proporcional agora garante que a forma não distorça
  const threshold = 65; 
  const score = Math.max(0, 1.0 - (bestScore / threshold));

  return { 
    spellId: score > 0.40 ? bestMatch : 'Falha', 
    accuracy: (score * 100).toFixed(0) 
  };
}

function pathDistance(pts1, pts2, isClosed) {
  const n = pts1.length;
  if (isClosed) {
    let minD = Infinity;
    for (let shift = 0; shift < n; shift++) {
      let d = 0;
      for (let i = 0; i < n; i++) {
        d += distance(pts1[(i + shift) % n], pts2[i]);
      }
      if (d < minD) minD = d;
    }
    return minD / n;
  } else {
    let dForward = 0;
    let dBackward = 0;
    for (let i = 0; i < n; i++) {
      dForward += distance(pts1[i], pts2[i]);
      dBackward += distance(pts1[i], pts2[n - 1 - i]);
    }
    return Math.min(dForward, dBackward) / n;
  }
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

function scaleProportional(points, size, bounds) {
  let scaled = [];
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = size / Math.max(width, height); 

  for (let i = 0; i < points.length; i++) {
    scaled.push({
      x: points[i].x * scale,
      y: points[i].y * scale
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

function centerInSquare(points, size, bounds) {
  const offsetX = (size - (bounds.maxX - bounds.minX)) / 2;
  const offsetY = (size - (bounds.maxY - bounds.minY)) / 2;
  let centered = [];
  for (let i = 0; i < points.length; i++) {
    centered.push({
      x: points[i].x + offsetX,
      y: points[i].y + offsetY
    });
  }
  return centered;
}
