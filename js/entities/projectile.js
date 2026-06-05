import { calculateSpellStats } from '../magic/spellbook.js';

export const activeProjectiles = [];

export function spawnProjectile(player, spellResult) {
  if (!spellResult || spellResult.spellId === 'Falha') return 0;

  const spellId = spellResult.spellId;
  const accuracyMod = parseFloat(spellResult.accuracy) / 100;
  
  const stats = calculateSpellStats(spellId, accuracyMod);

  if (player.mana < stats.manaCost) {
    const log = document.getElementById('spell-log');
    if (log) {
      log.textContent = "Mana Insuficiente!";
      log.style.color = "#ff0000";
    }
    return 500; 
  }
  
  player.mana -= stats.manaCost;

  if (stats.isSelf || stats.isProj || stats.isBarrier) {
    if (stats.heal > 0) {
      player.hp = Math.min(player.maxHp, player.hp + stats.heal);
    }
    
    if (stats.armorBuff > 0 || stats.speedBuff > 0 || stats.hpRegen > 0 || stats.manaRegen > 0) {
      player.armor += stats.armorBuff;
      player.speedBuff += stats.speedBuff;
      player.regenHpBuff += stats.hpRegen;
      player.regenManaBuff += stats.manaRegen;

      setTimeout(() => {
        player.armor -= stats.armorBuff;
        player.speedBuff -= stats.speedBuff;
        player.regenHpBuff -= stats.hpRegen;
        player.regenManaBuff -= stats.manaRegen;
      }, stats.life * 20);
    }
  }

  if (stats.isProj || stats.isBarrier) {
    const rad = player.angle * (Math.PI / 180);
    const speed = stats.isBarrier ? 0 : stats.projSpeed;

    // Deslocamento de Spawn: Spawna o projétil 0.6 unidades à frente do jogador
    // Isso impede a auto-colisão no bloco onde o jogador está no exato frame zero.
    const spawnOffset = 0.6;
    let startX = player.x + Math.cos(rad) * spawnOffset;
    let startY = player.y + Math.sin(rad) * spawnOffset;

    activeProjectiles.push({
      id: spellId,
      x: startX,
      y: startY,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed,
      color: stats.color,
      life: stats.life,
      size: stats.size,
      isStatic: stats.isBarrier,
      damage: stats.damage
    });
  }

  return stats.cooldown;
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
    
    // Tratamento deOutOfBounds para projéteis (impede erro de undefined se sair do mapa)
    if (p.life <= 0 || mapY < 0 || mapX < 0 || mapY >= map.length || mapX >= map[0].length || map[mapY][mapX] === 1) {
      activeProjectiles.splice(i, 1);
    }
  }
}
