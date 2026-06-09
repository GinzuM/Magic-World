import { player } from '../entities/player.js';
import { activeProjectiles } from '../entities/projectile.js';
import { SceneManager } from '../main.js';

const canvas = document.getElementById('raycaster');
const ctx = canvas.getContext('2d');

const FOV = 60;
const RESOLUTION = 1; 
const MAX_DEPTH = 100;

function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function castRays(map) {
  const isDungeon = SceneManager.isDungeon;
  
  const pitch = player.z * 0.8; 
  const horizon = Math.floor((canvas.height / 2) + pitch);

  // Renderização visual de chão/teto por gradiente (elimina a sensação "cortado")
  const skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
  skyGradient.addColorStop(0, isDungeon ? '#010102' : '#0a1220');
  skyGradient.addColorStop(1, isDungeon ? '#040406' : '#1b2a42');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, canvas.width, horizon);
  
  const floorGradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
  floorGradient.addColorStop(0, isDungeon ? '#0a0806' : '#141814');
  floorGradient.addColorStop(1, isDungeon ? '#030201' : '#080a08');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);

  const ZBuffer = new Float64Array(canvas.width);
  const halfFOV = FOV / 2;
  const rayAngleStep = FOV / canvas.width;
  
  for (let x = 0; x < canvas.width; x += RESOLUTION) {
    const rayAngle = (player.angle - halfFOV + (x * rayAngleStep)) % 360;
    const rad = degToRad(rayAngle);
    
    const rayDirX = Math.cos(rad);
    const rayDirY = Math.sin(rad);

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    let sideDistX, sideDistY;
    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);
    let perpWallDist;
    let stepX, stepY;
    let hit = 0;
    let side = 0;
    let hitType = 0;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
    }

    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
    }

    let distance = 0;
    while (hit === 0 && distance < MAX_DEPTH) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      if (mapY < 0 || mapX < 0 || mapY >= map.length || mapX >= map[0].length) {
        hit = 1;
        hitType = 1;
        break;
      }

      if (map[mapY] && map[mapY][mapX] > 0) {
        hit = 1;
        hitType = map[mapY][mapX];
      }
      distance++;
    }

    if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
    else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;

    const correctedDist = perpWallDist * Math.cos(degToRad(player.angle - rayAngle));
    ZBuffer[x] = correctedDist;

    const lineHeight = (canvas.height / correctedDist);
    const zOffset = player.z / correctedDist;
    const drawStart = -lineHeight / 2 + horizon + zOffset;
    
    let color;
    
    if (SceneManager.beaconTarget && mapX === SceneManager.beaconTarget.x && mapY === SceneManager.beaconTarget.y && hitType >= 2 && hitType <= 3) {
      color = side === 1 ? '#00ffff' : '#00cccc';
    } else {
      if (hitType === 1) { 
        color = side === 1 ? (isDungeon ? '#2c2c30' : '#0b3d30') : (isDungeon ? '#3a3a40' : '#125443');
      } else if (hitType === 2) { 
        color = side === 1 ? '#5200cc' : '#7300e6';
      } else if (hitType === 3) { 
        color = side === 1 ? '#007acc' : '#0099ff';
      } else if (hitType === 4) { 
        color = side === 1 ? '#8b5a2b' : '#a0522d';
      } else if (hitType === 5) { 
        color = side === 1 ? '#ffd700' : '#ffcc00';
      } else {
        color = '#000';
      }
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, drawStart, RESOLUTION, lineHeight);
  }

  renderSprites(ZBuffer, horizon);
}

function renderSprites(ZBuffer, horizon) {
  const sortedProjectiles = [...activeProjectiles].sort((a, b) => {
    const distA = Math.pow(player.x - a.x, 2) + Math.pow(player.y - a.y, 2);
    const distB = Math.pow(player.x - b.x, 2) + Math.pow(player.y - b.y, 2);
    return distB - distA;
  });

  const planeX = -Math.sin(degToRad(player.angle)) * 0.66;
  const planeY = Math.cos(degToRad(player.angle)) * 0.66;
  const dirX = Math.cos(degToRad(player.angle));
  const dirY = Math.sin(degToRad(player.angle));

  ctx.save();

  for (let i = 0; i < sortedProjectiles.length; i++) {
    const sprite = sortedProjectiles[i];
    const spriteX = sprite.x - player.x;
    const spriteY = sprite.y - player.y;

    const invDet = 1.0 / (planeX * dirY - dirX * planeY);
    const transformX = invDet * (dirY * spriteX - dirX * spriteY);
    const transformY = invDet * (-planeY * spriteX + planeX * spriteY);

    if (transformY > 0) {
      const spriteScreenX = Math.floor((canvas.width / 2) * (1 + transformX / transformY));
      
      const spriteScale = sprite.size || 0.15; 
      const spriteHeight = Math.abs(Math.floor(canvas.height / transformY)) * spriteScale;
      const spriteWidth = spriteHeight;

      const zOffset = player.z / transformY;
      const drawStartY = Math.floor(-spriteHeight / 2 + horizon) + zOffset;
      const drawStartX = Math.floor(spriteScreenX - spriteWidth / 2);
      const drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);

      ctx.fillStyle = sprite.color;
      ctx.shadowColor = sprite.color;
      ctx.shadowBlur = sprite.isStatic ? 0 : 25; 

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
        if (stripe >= 0 && stripe < canvas.width && transformY < ZBuffer[stripe]) {
          ctx.fillRect(stripe, drawStartY, 1, spriteHeight);
        }
      }
    }
  }

  ctx.restore();
}
