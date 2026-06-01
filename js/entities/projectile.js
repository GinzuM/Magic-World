import { calculateSpellStats } from '../magic/spellbook.js';

export const activeProjectiles = [];

export function spawnProjectile(player, spellResult) {
  if (!spellResult || spellResult.spellId === 'Falha') return 0;

  const spellId = spellResult.spellId;
  const accuracyMod = parseFloat(spellResult.accuracy) / 100;
  
  // Utiliza o novo motor de status centralizado do Spellbook
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

    activeProjectiles.push({
      id: spellId,
      x: player.x,
      y: player.y,
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
    
    // Projéteis param em paredes indestrutíveis (1) e bordas do mapa
    if (p.life <= 0 || !map[mapY] || map[mapY][mapX] === 1) {
      activeProjectiles.splice(i, 1);
    }
  }
}
