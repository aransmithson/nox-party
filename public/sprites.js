import {spriteFrames} from './sprite-data.js';
import {extraSpriteFrames} from './extra-sprite-data.js';
// Atlas bounds follow the artwork, so extended gloves never clip at a grid edge.
const brawlerFrames=[
 [72,10,188,281,94],[377,21,190,270,89],[662,14,262,276,128],[991,16,243,271,114],
 [32,326,260,287,128],[384,309,220,298,101],[686,312,219,260,115],[966,335,267,260,140],
 [40,640,238,267,120],[344,632,307,276,128],[689,629,215,277,93],[973,628,258,279,92],
 [54,937,221,287,106],[333,940,297,284,146],[717,918,145,314,74],[995,932,239,298,81]
];
const mazeFrames=spriteFrames.maze;
const atlases={car:{url:'/car-sprites.png',frames:extraSpriteFrames.car},umbrella:{url:'/umbrella-sprites.png',frames:extraSpriteFrames.umbrella},brawler:{url:'/brawler-sprites.png',frames:brawlerFrames,variants:new Map()},orbit:{url:'/brawler-orbit.png',frames:spriteFrames.orbit,variants:new Map()},ember:{url:'/brawler-ember.png',frames:spriteFrames.ember,variants:new Map()},tide:{url:'/brawler-tide.png',frames:spriteFrames.tide,variants:new Map()},maze:{url:'/maze-characters.png',frames:mazeFrames,overhead:true,variants:new Map()}};
export function spriteIdentity(color){return ({'#9a94ff':'orbit','#ff9675':'ember','#69deff':'tide'})[color]||'brawler';}
export function carFrame(color){return ['brawler','orbit','ember','tide'].indexOf(spriteIdentity(color));}
export function umbrellaFrame(p,time){return p.umbrella&&p.hp>0?carFrame(p.color)+(Math.floor(time*3)%2)*4:null;}
export function drawCarSprite(ctx,p){const atlas=atlases.car;if(!atlas.ready)return false;const [x,y,w,h]=atlas.frames[carFrame(p.color)],unit=40/w;ctx.drawImage(atlas.image,x,y,w,h,-20,-h*unit/2,40,h*unit);return true;}
for(const atlas of Object.values(atlases)){atlas.ready=false;if(typeof Image==='undefined')continue;const image=new Image();atlas.image=image;image.onload=()=>{atlas.ready=true;};image.src=atlas.url;}
export function spriteStatus(){return {brawler:['brawler','orbit','ember','tide'].every(id=>atlases[id].ready),maze:atlases.maze.ready,car:atlases.car.ready,umbrella:atlases.umbrella.ready,carFrames:extraSpriteFrames.car.length,umbrellaFrames:extraSpriteFrames.umbrella.length,identities:4,combatFrames:brawlerFrames.length,mazeFrames:mazeFrames.length};}
function variant(atlas,color){const key=color;if(atlas.variants.has(key))return atlas.variants.get(key);const target=color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));const canvas=document.createElement('canvas');canvas.width=atlas.image.naturalWidth;canvas.height=atlas.image.naturalHeight;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas.image,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
 if(!atlas.shoeMask){atlas.shoeMask=new Uint8Array(canvas.width*canvas.height);for(const [x,y,w,h]of atlas.frames)for(let py=Math.floor(y+h*(atlas.overhead?.35:.48));py<Math.min(canvas.height,y+h);py++)for(let px=x;px<Math.min(canvas.width,x+w);px++)if(!atlas.overhead||py>y+h*.65||px<x+w*.27)atlas.shoeMask[py*canvas.width+px]=1;}
 for(let i=0;i<data.length;i+=4){if(data[i+3]<5)continue;const r=data[i],g=data[i+1],b=data[i+2],shoe=atlas.shoeMask[i/4]&&Math.min(r,g,b)>100&&Math.max(r,g,b)-Math.min(r,g,b)<75;if(g>r*1.1&&g>b*1.35||shoe){const shade=Math.min(1.2,(r*.2126+g*.7152+b*.0722)/(shoe?225:195));for(let c=0;c<3;c++)data[i+c]=Math.min(255,target[c]*shade);}}
 ctx.putImageData(pixels,0,0);atlas.variants.set(key,canvas);return canvas;
}
export function brawlerFrame(p,time,gameTime){
 if(p.hp<=0||p.stun>0||p.stumble>0)return 13;if(p.climb)return 15;if(p.hang)return 14;if(p.blocking)return 12;
 if(p.attack){const progress=(gameTime-p.attack.start)/(p.attack.until-p.attack.start);return p.attack.type==='punch'?(progress<.28?8:9):progress<.24?10:11;}
 if(!p.ground)return p.vy<0?6:7;if(Math.abs(p.vx)>25){const stride=p.stride??time*10;return [2,3,4,5][Math.floor(((stride%(Math.PI*2))+Math.PI*2)%(Math.PI*2)/(Math.PI/2))];}return Math.sin(time*2.8)>0?0:1;
}
export function createSpriteFighters(ctx){
 const poses=new Map();
 return function draw(p,time,dt,gameTime,ghost=false){const umbrellaPose=umbrellaFrame(p,time),umbrella=umbrellaPose!==null&&atlases.umbrella.ready,atlas=umbrella?atlases.umbrella:atlases[spriteIdentity(p.color)];if(!atlas.ready)return false;if(p.lives<=0||p.respawn>0){poses.delete(p.id);return true;}
  let pose=poses.get(p.id);if(!pose||Math.hypot(pose.x-p.x,pose.y-p.y)>180){pose={x:p.x,y:p.y};poses.set(p.id,pose);}const ease=1-Math.exp(-30*dt);pose.x+=(p.x-pose.x)*ease;pose.y+=(p.y-pose.y)*ease;
  const moving=p.ground&&Math.abs(p.vx)>25,frame=umbrella?umbrellaPose:brawlerFrame(p,time,gameTime),[sx,sy,w,h,anchor]=atlas.frames[frame],unit=umbrella?104/h:68/281*.88,cycle=p.stride||time*10;
  const bob=moving?-Math.abs(Math.sin(cycle))*1.3:Math.sin(time*3)*.6,squash=Math.sin(time*(moving?10:3))*(moving?.024:.012)+(p.land||0)*.4;
  ctx.save();ctx.translate(pose.x,pose.y);ctx.save();ctx.scale(p.face||1,1);ctx.rotate((p.balance||0)*(p.face||1)*.65+Math.sin(time*4.5)*(moving?.04:.02));if(p.hp<=0)ctx.rotate(time*7);ctx.translate(0,bob);ctx.scale(1+squash,1-squash);ctx.globalAlpha=ghost?.55:p.inv>0?.7+Math.sin(time*18)*.25:1;
  ctx.shadowColor=p.color;ctx.shadowBlur=3;ctx.drawImage(umbrella?atlas.image:variant(atlas,p.color),sx,sy,w,h,-anchor*unit,-h*unit,w*unit,h*unit);ctx.shadowBlur=0;
  if(p.blocking){ctx.strokeStyle='#b9e9ff';ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-34,29,-1.1,1.1);ctx.stroke();}
  if(p.umbrella&&!umbrella){ctx.globalAlpha=1;ctx.strokeStyle=p.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(5,-42);ctx.lineTo(5,-100);ctx.stroke();ctx.beginPath();ctx.arc(5,-99,30,Math.PI,0);ctx.quadraticCurveTo(25,-106,15,-99);ctx.quadraticCurveTo(5,-107,-5,-99);ctx.quadraticCurveTo(-15,-106,-25,-99);ctx.fillStyle='#11121c';ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(5,-129);ctx.lineTo(-5,-99);ctx.moveTo(5,-129);ctx.lineTo(15,-99);ctx.stroke();}
  ctx.restore();ctx.globalAlpha=ghost?.65:1;const label=umbrella?-140:p.umbrella?-143:-80;ctx.textAlign='center';ctx.font='600 12px Arial';ctx.fillStyle=p.color;ctx.fillText(p.name,0,label);ctx.fillStyle='#30323d';ctx.fillRect(-26,label+7,52,4);ctx.fillStyle=p.color;ctx.fillRect(-26,label+7,52*Math.max(0,p.hp)/100,4);ctx.font='9px Arial';ctx.fillText(p.unlimitedLives?'∞':'● '.repeat(p.lives).trim(),0,label+20);ctx.restore();return true;
 };
}
export function drawMazeSprite(ctx,p,now){const atlas=atlases.maze;if(!atlas.ready)return false;const moving=Math.hypot(p.vx,p.vy)>1,frame=moving?(Math.sin(p.stride)>0?1:2):0,identity=['brawler','orbit','ember','tide'].indexOf(spriteIdentity(p.color)),[sx,sy,w,h]=mazeFrames[identity*4+frame],unit=36/mazeFrames[0][3];ctx.save();ctx.translate(p.x,p.y);ctx.rotate((p.angle||0)+(moving?Math.sin(p.stride)*.04:Math.sin(now/500)*.015));ctx.scale(1+Math.sin(now/130)*.015,1-Math.sin(now/130)*.015);ctx.drawImage(variant(atlas,p.color),sx,sy,w,h,-w*unit*.5,-h*unit*.5,w*unit,h*unit);if(p.inv>0){ctx.strokeStyle='#f0ffd6';ctx.lineWidth=1;ctx.setLineDash([3,4]);ctx.beginPath();ctx.arc(0,0,25,0,Math.PI*2);ctx.stroke();}ctx.restore();return true;}
