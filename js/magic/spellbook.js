export const SpellRegistry = {
  // ELEMENTOS (Fornecem os atributos base e definem a cor/natureza)
  'A': { id: 'A', type: 'Elemento', name: 'Ignis (Fogo)', desc: 'Canaliza calor extremo. Concede dano massivo e velocidade moderada.', stats: 'Dano Base: 35 | Vel: +0.08 | Mana: 12' },
  'E': { id: 'E', type: 'Elemento', name: 'Terra', desc: 'Materializa rocha sólida. Foco em defesa passiva e durabilidade.', stats: 'Armadura: 15 | Duração: +100 | Mana: 10' },
  'I': { id: 'I', type: 'Elemento', name: 'Fulgur (Raio)', desc: 'Energia pura e instável. Altíssima velocidade de disparo.', stats: 'Dano: 20 | Vel: +0.18 | Recarga: -80ms' },
  'O': { id: 'O', type: 'Elemento', name: 'Aqua (Água)', desc: 'Elemento fluído de restauração. Cura imediata de ferimentos.', stats: 'Cura: 25 | Duração: +50 | Mana: 15' },
  'U': { id: 'U', type: 'Elemento', name: 'Arcanum', desc: 'Manipulação do éter. Aumenta a regeneração contínua de mana.', stats: 'Regen Mana: +0.20 | Custo Geral: -4 | Mana: 8' },
  
  // FORMAS (Definem o comportamento espacial da magia)
  'V': { id: 'V', type: 'Forma', name: 'Lança (Projétil)', desc: 'Comprime a magia em um vetor de ataque arremessável.', stats: 'Ativa Disparo | Alcance: Longo | Mana: 5' },
  'C': { id: 'C', type: 'Forma', name: 'Aura (Self/Toque)', desc: 'Infunde a magia no próprio corpo ou em alvos próximos.', stats: 'Ativa Self/Buff | Alcance: Zero | Mana: 5' },
  'S': { id: 'S', type: 'Forma', name: 'Barreira (Fixo)', desc: 'Ergue a magia no ambiente como um obstáculo estático.', stats: 'Ativa Barreira | Vida: +200 | Mana: 10' },

  // MODIFICADORES SINGULARES (Alteram apenas 1 propriedade específica)
  'L': { id: 'L', type: 'Mod', name: 'Extensão', desc: 'Aumenta significativamente o tempo de duração da magia ou buff.', stats: 'Tempo de Vida: +150 | Mana: 5' },
  'Z': { id: 'Z', type: 'Mod', name: 'Amplidão', desc: 'Aumenta a área de efeito e o tamanho físico da manifestação.', stats: 'Tamanho: +0.25 | Mana: 8' },
  'N': { id: 'N', type: 'Mod', name: 'Impacto', desc: 'Afiamento letal. Aumenta exclusivamente o dano causado.', stats: 'Dano: +20 | Mana: 10' },
  'W': { id: 'W', type: 'Mod', name: 'Eficiência', desc: 'Otimiza o fluxo arcano, reduzindo o custo total de mana.', stats: 'Custo Total: -15 Mana | Cooldown: +50ms' },
  'J': { id: 'J', type: 'Mod', name: 'Celeridade', desc: 'Acelera a recarga do grimório para disparos mais rápidos.', stats: 'Cooldown: -100ms | Mana: 8' },
  'M': { id: 'M', type: 'Mod', name: 'Vento (Mobilidade)', desc: 'Transfere energia para as pernas, aumentando velocidade de corrida.', stats: 'Velocidade (Run): +0.30 | Mana: 10' },
  'P': { id: 'P', type: 'Mod', name: 'Vitalidade', desc: 'Estimula as células, aumentando a regeneração passiva de vida.', stats: 'Regen HP: +0.05 | Duração: +50 | Mana: 15' }
};

const NUM_POINTS = 64;
const SQUARE_SIZE = 100;

// Geometrias unistroke desenhadas para evitar conflitos (15 glifos)
const rawTemplates = {
  'A': [{x: 20, y: 90}, {x: 50, y: 10}, {x: 80, y: 90}], // Triângulo Subindo
  'E': [{x: 80, y: 20}, {x: 20, y: 20}, {x: 20, y: 50}, {x: 60, y: 50}, {x: 20, y: 50}, {x: 20, y: 80}, {x: 80, y: 80}], // Letra E
  'I': [{x: 50, y: 10}, {x: 50, y: 90}], // Linha Reta Vertical
  'U': [{x: 20, y: 20}, {x: 20, y: 70}, {x: 40, y: 90}, {x: 60, y: 90}, {x: 80, y: 70}, {x: 80, y: 20}], // Curva U
  'V': [{x: 20, y: 20}, {x: 50, y: 90}, {x: 80, y: 20}], // V descendo
  'C': [{x: 80, y: 20}, {x: 40, y: 20}, {x: 20, y: 40}, {x: 20, y: 60}, {x: 40, y: 80}, {x: 80, y: 80}], // Círculo esquerdo
  'S': [{x: 80, y: 20}, {x: 20, y: 20}, {x: 20, y: 50}, {x: 80, y: 50}, {x: 80, y: 80}, {x: 20, y: 80}], // Curva S
  'L': [{x: 20, y: 20}, {x: 20, y: 80}, {x: 80, y: 80}], // L clássico
  'Z': [{x: 20, y: 20}, {x: 80, y: 20}, {x: 20, y: 80}, {x: 80, y: 80}], // Z zigue-zague
  'N': [{x: 20, y: 80}, {x: 20, y: 20}, {x: 80, y: 80}, {x: 80, y: 20}], // N zigue-zague subindo
  'W': [{x: 20, y: 20}, {x: 35, y: 90}, {x: 50, y: 50}, {x: 65, y: 90}, {x: 80, y: 20}], // W duplo V
  'J': [{x: 80, y: 20}, {x: 80, y: 80}, {x: 50, y: 90}, {x: 20, y: 80}, {x: 20, y: 60}], // Gancho J
  'M': [{x: 20, y: 90}, {x: 20, y: 20}, {x: 50, y: 50}, {x: 80, y: 20}, {x: 80, y: 90}], // M clássico
  'P': [{x: 20, y: 90}, {x: 20, y: 20}, {x: 80, y: 20}, {x: 80, y: 50}, {x: 20, y: 50}] // P loop quadrado
};

export const Templates = {};

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

  const threshold = 60; 
  const score = Math.max(0, 1.0 - (bestScore / threshold));

  return { 
    spellId: score > 0.45 ? bestMatch : 'Falha', 
    accuracy: (score * 100).toFixed(0) 
  };
}

// Calculadora de Status transferida para o Spellbook (Acessível pelo Preview e pelo Projetil)
export function calculateSpellStats(spellId, accuracyMod = 1.0) {
  let s = {
    damage: 0, projSpeed: 0, size: 0.15, life: 150, heal: 0, 
    armorBuff: 0, speedBuff: 0, hpRegen: 0, manaRegen: 0,
    manaCost: 0, cooldown: 300, isProj: false, isBarrier: false, isSelf: false,
    elementColors: []
  };

  for (let char of spellId) {
    switch(char) {
      case 'A': s.damage += 35; s.projSpeed += 0.08; s.manaCost += 12; s.elementColors.push({r:255,g:51,b:0}); break;
      case 'E': s.armorBuff += 15; s.life += 100; s.manaCost += 10; s.elementColors.push({r:139,g:69,b:19}); break;
      case 'I': s.damage += 20; s.projSpeed += 0.18; s.cooldown -= 80; s.manaCost += 15; s.elementColors.push({r:0,g:255,b:255}); break;
      case 'O': s.heal += 25; s.life += 50; s.manaCost += 15; s.elementColors.push({r:0,g:102,b:255}); break;
      case 'U': s.manaRegen += 0.20; s.manaCost += 8; s.manaCost -= 4; s.elementColors.push({r:160,g:32,b:240}); break;
      
      case 'V': s.isProj = true; s.manaCost += 5; break;
      case 'C': s.isSelf = true; s.manaCost += 5; break;
      case 'S': s.isBarrier = true; s.life += 200; s.manaCost += 10; break;
      
      case 'L': s.life += 150; s.manaCost += 5; break;
      case 'Z': s.size += 0.25; s.manaCost += 8; break;
      case 'N': s.damage += 20; s.manaCost += 10; break;
      case 'W': s.manaCost -= 15; s.cooldown += 50; break;
      case 'J': s.cooldown -= 100; s.manaCost += 8; break;
      case 'M': s.speedBuff += 0.30; s.manaCost += 10; break;
      case 'P': s.hpRegen += 0.05; s.life += 50; s.manaCost += 15; break;
    }
  }

  if (!s.isProj && !s.isBarrier && !s.isSelf && spellId.length > 0) s.isSelf = true;
  
  if (spellId.length >= 5) {
    s.damage *= 1.5; s.heal *= 1.5; s.armorBuff *= 1.5; s.manaCost *= 0.8; s.cooldown += 100;
  }

  s.damage *= accuracyMod;
  s.projSpeed *= accuracyMod;
  s.heal *= accuracyMod;
  s.armorBuff *= accuracyMod;
  s.speedBuff *= accuracyMod;
  s.hpRegen *= accuracyMod;
  s.manaRegen *= accuracyMod;

  s.cooldown = Math.max(100, s.cooldown);
  s.manaCost = Math.max(5, s.manaCost);
  s.life = Math.max(10, s.life * (accuracyMod + 0.2));

  let finalColor = '#ffffff';
  if (s.elementColors.length > 0) {
    let r = 0, g = 0, b = 0;
    for (let col of s.elementColors) { r += col.r; g += col.g; b += col.b; }
    r = Math.floor(r / s.elementColors.length);
    g = Math.floor(g / s.elementColors.length);
    b = Math.floor(b / s.elementColors.length);
    finalColor = `rgb(${r},${g},${b})`;
  }
  s.color = finalColor;

  return s;
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

function distance(p1, p2) { return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)); }
function pathLength(points) {
  let d = 0;
  for (let i = 1; i < points.length; i++) d += distance(points[i - 1], points[i]);
  return d;
}
function calculateBoundingBox(path) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < path.length; i++) {
    minX = Math.min(minX, path[i].x); maxX = Math.max(maxX, path[i].x);
    minY = Math.min(minY, path[i].y); maxY = Math.max(maxY, path[i].y);
  }
  return { minX, maxX, minY, maxY };
}
function scaleProportional(points, size, bounds) {
  let scaled = [];
  const width = Math.max(bounds.maxX - bounds.minX, 1);
  const height = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = size / Math.max(width, height); 
  for (let i = 0; i < points.length; i++) scaled.push({ x: points[i].x * scale, y: points[i].y * scale });
  return scaled;
}
function translateToOrigin(points, bounds) {
  let translated = [];
  for (let i = 0; i < points.length; i++) translated.push({ x: points[i].x - bounds.minX, y: points[i].y - bounds.minY });
  return translated;
}
function centerInSquare(points, size, bounds) {
  const offsetX = (size - (bounds.maxX - bounds.minX)) / 2;
  const offsetY = (size - (bounds.maxY - bounds.minY)) / 2;
  let centered = [];
  for (let i = 0; i < points.length; i++) centered.push({ x: points[i].x + offsetX, y: points[i].y + offsetY });
  return centered;
}
