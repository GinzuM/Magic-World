import { player } from '../entities/player.js';

const canvas = document.getElementById('raycaster');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

const fov = 60;

function degToRad(deg) {
  return deg * Math.PI / 180;
}

export function castRays(currentMap) {
  ctx.fillStyle = '#111'; // Teto
  ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  ctx.fillStyle = '#222'; // Chão
  ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

  for (let i = 0; i < canvas.width; i += 2) {
    const rayAngle = player.angle - fov / 2 + (fov * i / canvas.width);
    const rayDirX = Math.cos(degToRad(rayAngle));
    const rayDirY = Math.sin(degToRad(rayAngle));
    
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);
    
    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);
    
    let sideDistX, sideDistY, stepX, stepY, hit = 0, side;

    if (rayDirX < 0) { stepX = -1; sideDistX = (player.x - mapX) * deltaDistX; } 
    else { stepX = 1; sideDistX = (mapX + 1.0 - player.x) * deltaDistX; }
    
    if (rayDirY < 0) { stepY = -1; sideDistY = (player.y - mapY) * deltaDistY; } 
    else { stepY = 1; sideDistY = (mapY + 1.0 - player.y) * deltaDistY; }

    while (hit === 0) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; } 
      else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      if (currentMap[mapY] && currentMap[mapY][mapX] > 0) hit = 1;
    }

    if (hit) {
      const perpWallDist = (side === 0) ? (mapX - player.x + (1 - stepX) / 2) / rayDirX : (mapY - player.y + (1 - stepY) / 2) / rayDirY;
      const lineHeight = canvas.height / perpWallDist;
      const drawStart = -lineHeight / 2 + canvas.height / 2;
      
      ctx.fillStyle = side === 1 ? 'rgba(0,100,100,1)' : 'rgba(0,150,150,1)';
      ctx.fillRect(i, drawStart, 2, lineHeight);
    }
  }
}
