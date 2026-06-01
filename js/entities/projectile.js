export const activeProjectiles = [];

export function spawnProjectile(player, spellResult) {
  if (!spellResult || spellResult.spellId === 'Falha') return 0;

  const spellId = spellResult.spellId;
  const accuracyMod = parseFloat(spellResult.accuracy) / 100;
  
  // 1. Inicialização de Atributos Base da Fórmula Mágica
  let baseDamage = 0;
  let baseProjSpeed = 0;
  let baseSize = 0.15;
  let baseLife = 150;
  let baseHeal = 0;
  let baseArmorBuff = 0;
  let baseSpeedBuff = 0;
  let baseHpRegenBuff = 0;
  let baseManaRegenBuff = 0;

  let modMagnitude = 1.0;
  let modCelerity = 1.0;
  let modImpact = 1.0;
  let modVitality = 1.0;

  let isProj = false;
  let isBarrier = false;
  let isSelf = false;

  let elementColors = [];
  let manaCost = 10;
  let cooldown = 300;

  // 2. Processamento de Componentes (Runas Singulares)
  for (let char of spellId) {
    manaCost += 8;
    cooldown += 150;

    switch(char) {
      // Elementos
      case 'A': // Fogo
        baseDamage += 35;
        baseProjSpeed += 0.04;
        elementColors.push({r: 255, g: 51, b: 0});
        break;
      case 'E': // Terra
        baseArmorBuff += 15;
        baseSize += 0.25;
        baseLife += 100;
        elementColors.push({r: 139, g: 69, b: 19});
        break;
      case 'I': // Raio
        baseDamage += 20;
        baseProjSpeed += 0.12;
        cooldown -= 80;
        elementColors.push({r: 0, g: 255, b: 255});
        break;
      case 'O': // Água
        baseHeal += 15;
        baseHpRegenBuff += 0.03;
        elementColors.push({r: 0, g: 102, b: 255});
        break;
      case 'U': // Arcano
        baseManaRegenBuff += 0.20;
        baseSpeedBuff += 0.25;
        manaCost -= 4;
        elementColors.push({r: 160, g: 32, b: 240});
        break;

      // Formas
      case 'V': isProj = true; break;
      case 'C': isSelf = true; break;
      case 'S': isBarrier = true; break;

      // Modificadores
      case 'M': modMagnitude += 0.8; manaCost += 10; break;
      case 'N': modCelerity += 0.8; cooldown -= 100; break;
      case 'D': modImpact += 0.8; manaCost += 5; break;
      case 'W': modVitality += 0.8; break;
    }
  }

  // Se nenhuma forma explícita for desenhada, assume Self/Toque por segurança
  if (!isProj && !isBarrier && !isSelf) isSelf = true;

  // 3. Aplicação Algorítmica de Sinergia Rúnica Lendária (5+ Letras)
  if (spellId.length >= 5) {
    baseDamage *= 1.4;
    baseHeal *= 1.4;
    baseArmorBuff *= 1.4;
    manaCost *= 0.85; // Bónus de eficiência mágica
    cooldown += 200;
  }

  // 4. Interpolação e Balanceamento Final por Modificadores
  const finalDamage = baseDamage * modImpact * accuracyMod;
  const finalProjSpeed = baseProjSpeed * modCelerity * accuracyMod;
  const finalSize = baseSize * modMagnitude;
  const finalLife = baseLife * modMagnitude * (accuracyMod + 0.2);
  const finalHeal = baseHeal * modVitality * accuracyMod;
  
  const finalArmorBuff = baseArmorBuff * modImpact * accuracyMod;
  const finalSpeedBuff = baseSpeedBuff * modCelerity * accuracyMod;
  const finalHpRegenBuff = baseHpRegenBuff * modVitality * accuracyMod;
  const finalManaRegenBuff = baseManaRegenBuff * modVitality * accuracyMod;

  const finalCooldown = Math.max(120, cooldown / modCelerity);
  const finalManaCost = Math.max(5, manaCost);

  // 5. Verificação e Abatimento do Buffer de Mana do Jogador
  if (player.mana < finalManaCost) {
    document.getElementById('spell-log').textContent = "Mana Insuficiente!";
    document.getElementById('spell-log').style.color = "#ff0000";
    return 500; 
  }
  player.mana -= finalManaCost;

  // 6. Execução das Propriedades de Efeito Pessoal (Self/Buffs)
  if (isSelf || isProj || isBarrier) {
    if (finalHeal > 0) {
      player.hp = Math.min(player.maxHp, player.hp + finalHeal);
    }
    
    if (finalArmorBuff > 0 || finalSpeedBuff > 0 || finalHpRegenBuff > 0 || finalManaRegenBuff > 0) {
      player.armor += finalArmorBuff;
      player.speedBuff += finalSpeedBuff;
      player.regenHpBuff += finalHpRegenBuff;
      player.regenManaBuff += finalManaRegenBuff;

      // Duração dinâmica calculada com base na vida do feitiço
      setTimeout(() => {
        player.armor -= finalArmorBuff;
        player.speedBuff -= finalSpeedBuff;
        player.regenHpBuff -= finalHpRegenBuff;
        player.regenManaBuff -= finalManaRegenBuff;
      }, finalLife * 20);
    }
  }

  // 7. Geração de Cor Combinada Dinâmica (Média Cromática dos Elementos)
  let finalColor = '#ffffff';
  if (elementColors.length > 0) {
    let r = 0, g = 0, b = 0;
    for (let col of elementColors) { r += col.r; g += col.g; b += col.b; }
    r = Math.floor(r / elementColors.length);
    g = Math.floor(g / elementColors.length);
    b = Math.floor(b / elementColors.length);
    finalColor = `rgb(${r},${g},${b})`;
  }

  // 8. Instanciação Física da Entidade de Projeção Vetorial no Espaço
  if (isProj || isBarrier) {
    const rad = player.angle * (Math.PI / 180);
    const speed = isBarrier ? 0 : finalProjSpeed;

    activeProjectiles.push({
      id: spellId,
      x: player.x,
      y: player.y,
      dx: Math.cos(rad) * speed,
      dy: Math.sin(rad) * speed,
      color: finalColor,
      life: finalLife,
      size: finalSize,
      isStatic: isBarrier,
      damage: finalDamage
    });
  }

  return finalCooldown;
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
    
    if (p.life <= 0 || (map[mapY] && map[mapY][mapX] === 1)) {
      activeProjectiles.splice(i, 1);
    }
  }
}
