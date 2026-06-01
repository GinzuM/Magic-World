export const activeProjectiles = [];

export function spawnProjectile(player, spellResult) {
  if (!spellResult || spellResult.spellId === 'Falha') return;

  const spellId = spellResult.spellId;
  const accuracyMod = parseFloat(spellResult.accuracy) / 100;
  
  // Parâmetros base da entidade balística
  let speed = 0.08;
  let color = '#ffffff';
  let life = 150; // Tempo de vida em frames

  // Dicionário de propriedades físicas do projétil
  switch(spellId) {
    case 'A': // Ignis (Rápido e Vermelho)
      color = '#ff3300'; 
      speed = 0.15 * accuracyMod; 
      break;
    case 'E': // Terra (Lento, Dourado/Marrom e denso)
      color = '#8b4513'; 
      speed = 0.06 * accuracyMod; 
      life = 200;
      break;
    case 'I': // Fulgur (Velocidade Extrema, Ciano)
      color = '#00ffff'; 
      speed = 0.25 * accuracyMod; 
      life = 80;
      break;
    case 'O': // Aegis (Escudo/Retração - Não é um tiro linear)
      color = '#ff00ff'; 
      speed = 0; 
      life = 300;
      break;
    case 'U': // Aqua (Velocidade média, Azul)
      color = '#0066ff'; 
      speed = 0.10 * accuracyMod; 
      break;
    default:
      // Concatenações complexas (ex: AI, EU) receberão um projétil misto
      color = '#ffffff';
      speed = 0.12 * accuracyMod;
      break;
  }

  // Conversão polar para escalar o vetor direcional com base no ângulo de visão da câmera
  const rad = player.angle * (Math.PI / 180);
  
  activeProjectiles.push({
    id: spellId,
    x: player.x,
    y: player.y,
    dx: Math.cos(rad) * speed,
    dy: Math.sin(rad) * speed,
    color: color,
    life: life,
    accuracy: spellResult.accuracy
  });
}

export function updateProjectiles(deltaTime, timeScale, map) {
  const timeMultiplier = (deltaTime / 16) * timeScale;

  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    let p = activeProjectiles[i];
    
    // Atualização cinemática (O Aegis 'O' permanece travado no eixo de origem)
    if (p.id !== 'O') {
      p.x += p.dx * timeMultiplier;
      p.y += p.dy * timeMultiplier;
    }

    p.life -= timeMultiplier;

    // Detecção de Colisão com a malha estrutural (Matriz Overworld)
    let mapX = Math.floor(p.x);
    let mapY = Math.floor(p.y);
    
    // Destrói o projétil se o tempo de vida expirar ou se colidir com uma parede (valor > 0)
    if (p.life <= 0 || (map[mapY] && map[mapY][mapX] > 0)) {
      activeProjectiles.splice(i, 1);
    }
  }
}
