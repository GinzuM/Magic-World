import { player } from '../entities/player.js';
import { activeProjectiles } from '../entities/projectile.js';
import { SceneManager } from '../main.js';

const canvas = document.getElementById('raycaster');
const ctx = canvas.getContext('2d');

const FOV = 60;
const RESOLUTION = 1; 

function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function castRays(map) {
  const isDungeon = SceneManager.isDungeon;
  
  ctx.fillStyle = isDungeon ? '#020202' : '#050505'; 
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = isDungeon ? '#0a0a0a' : '#0a0a0a'; 
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

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

    while (hit === 0) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      if (map[mapY] && map[mapY][mapX] > 0) {
        hit = 1;
        hitType = map[mapY][mapX];
      }
    }

    if (side === 0) perpWallDist = (mapX - player.x + (1 - stepX) / 2) / rayDirX;
    else perpWallDist = (mapY - player.y + (1 - stepY) / 2) / rayDirY;

    const correctedDist = perpWallDist * Math.cos(degToRad(player.angle - rayAngle));
    ZBuffer[x] = correctedDist;

    const lineHeight = (canvas.height / correctedDist);
    const drawStart = -lineHeight / 2 + canvas.height / 2;
    
    let color;
    if (hitType === 1) { 
      if (isDungeon) {
        color = side === 1 ? '#333333' : '#444444';
      } else {
        color = side === 1 ? '#004444' : '#006666';
      }
    } else if (hitType === 2) { 
      color = side === 1 ? '#6600cc' : '#8800ff';
    } else if (hitType === 3) { 
      color = side === 1 ? '#0088cc' : '#00aaff';
    }

    ctx.fillStyle = color;
    ctx.fillRect(x, drawStart, RESOLUTION, lineHeight);
  }

  renderSprites(ZBuffer);
}

function renderSprites(ZBuffer) {
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

      const drawStartY = Math.floor(-spriteHeight / 2 + canvas.height / 2);
      const drawStartX = Math.floor(spriteScreenX - spriteWidth / 2);
      const drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);

      ctx.fillStyle = sprite.color;
      ctx.shadowColor = sprite.color;
      ctx.shadowBlur = (sprite.isStatic) ? 0 : 20; 

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
        if (stripe >= 0 && stripe < canvas.width && transformY < ZBuffer[stripe]) {
          ctx.fillRect(stripe, drawStartY, 1, spriteHeight);
        }
      }
    }
  }

  ctx.restore();
}
