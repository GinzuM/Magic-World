export const activeProjectiles = [];

export function spawnProjectile(player, spellResult) {
  if (!spellResult || spellResult.spellId === 'Falha') return 0;

  const spellId = spellResult.spellId;
  const accuracyMod = parseFloat(spellResult.accuracy) / 100;
  
  // Propriedades modulares dinâmicas calculadas pelas combinações de runas
  let stats = {
    manaCost: spellId.length * 5, 
    cooldown: spellId.length * 200,
    projSpeed: 0, 
    projSize: 0.15, 
    projLife: 150,
    heal: 0, 
    armorBuff: 0, 
    speedBuff: 0, 
    regenHp: 0, 
    regenMana: 0,
    isProj: false, 
    isBarrier: false, 
    damage: 0
  };

  for (let char of spellId) {
    switch(char) {
      case 'A': // Ignis: Arremessável, Velocidade, Dano
        stats.isProj = true; 
        stats.damage += 30; 
        stats.projSpeed += 0.08; 
        stats.manaCost += 15; 
        stats.cooldown += 200; 
        break;
      case 'E': // Terra: Barreira física, Armadura, Tamanho
        stats.isBarrier = true; 
        stats.projSize += 0.4; 
        stats.projLife += 200; 
        stats.armorBuff += 10; 
        stats.manaCost += 15; 
        break;
      case 'I': // Fulgur: Aceleração de disparo e corrida, Dano
        stats.isProj = true;
        stats.projSpeed += 0.18; 
        stats.damage += 15; 
        stats.speedBuff += 0.4; 
        stats.manaCost += 10; 
        stats.cooldown -= 50; 
        break;
      case 'O': // Aegis: Buff de Status passivo, Escudo
        stats.regenHp += 0.02; 
        stats.regenMana += 0.15; 
        stats.manaCost += 20; 
        stats.cooldown += 300; 
        break;
      case 'U': // Aqua: Cura instantânea, Duração estendida, Custo baixo
        stats.heal += 25; 
        stats.manaCost -= 10; 
        stats.projLife += 150; 
        stats.cooldown -= 80; 
        break;
    }
  }

  // Tratamento de segurança e consumo de Mana
  if (stats.manaCost < 5) stats.manaCost = 5;
  if (player.mana < stats.manaCost) {
    document.getElementById('spell-log').textContent = "Mana Insuficiente!";
    document.getElementById('spell-log').style.color = "#ff0000";
    return 600; // Cooldown de penalidade por cast forçado
  }
  player.mana -= stats.manaCost;

  // Aplicação de Vetores de Uso Pessoal (Self/Touch)
  if (stats.heal > 0) {
    player.hp = Math.min(player.maxHp, player.hp + stats.heal * accuracyMod);
  }
  
  const hasBuffs = stats.armorBuff > 0 || stats.speedBuff > 0 || stats.regenHp > 0 || stats.regenMana > 0;
  if (hasBuffs) {
    player.armor += stats.armorBuff;
    player.speedBuff += stats.speedBuff;
    player.regenHpBuff += stats.regenHp;
    player.regenManaBuff += stats.regenMana;

    const duration = 3000 + (stats.projLife * 15);
    setTimeout(() => {
      player.armor -= stats.armorBuff;
      player.speedBuff -= stats.speedBuff;
      player.regenHpBuff -= stats.regenHp;
      player.regenManaBuff -= stats.regenMana;
    }, duration);
  }

  // Instanciação de Entidades no Motor Físico (Projéteis ou Barreiras Estáticas)
  if (stats.isProj || stats.isBarrier) {
    let color = '#ffffff';
    if (spellId.includes('A')) color = '#ff3300';
    else if (spellId.includes('E') && !stats.isProj) color = '#8b4513';
    else if (spellId.includes('I')) color = '#00ffff';
    else if (spellId.includes('U')) color = '#0066ff';
    else if (stats.isBarrier) color = '#ff00ff';

    const rad = player.angle * (Math.PI / 180);
    const finalSpeed = (stats.isBarrier && !stats.isProj) ? 0 : stats.projSpeed * accuracyMod;

    activeProjectiles.push({
      id: spellId,
      x: player.x,
      y: player.y,
      dx: Math.cos(rad) * finalSpeed,
      dy: Math.sin(rad) * finalSpeed,
      color: color,
      life: stats.projLife * (accuracyMod + 0.2),
      size: stats.projSize,
      isStatic: stats.isBarrier && !stats.isProj
    });
  }

  return Math.max(150, stats.cooldown); 
}

export function updateProjectiles(deltaTime, timeScale, map) {
  const timeMultiplier = (deltaTime / 16) * timeScale;

  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    let p = activeProjectiles[i];
    
    if (!p.isStatic) {
      p.x += p.dx * timeMultiplier;
      p.y += p.dy * timeMultiplier;
    }

    p.life -= timeMultiplier;

    let mapX = Math.floor(p.x);
    let mapY = Math.floor(p.y);
    
    // Calcula colisão excluindo o chão (0) e portais abertos (> 1)
    if (p.life <= 0 || (map[mapY] && map[mapY][mapX] === 1)) {
      activeProjectiles.splice(i, 1);
    }
  }
}
