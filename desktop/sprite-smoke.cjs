const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
module.exports=async({desk})=>{
 const run=s=>desk.webContents.executeJavaScript(s);
 await run(`(async()=>{const {spriteStatus}=await import('/sprites.js');for(let n=0;n<100;n++){const s=spriteStatus();if(s.brawler&&s.car&&s.umbrella)return;await new Promise(r=>setTimeout(r,50));}throw new Error('Sprite atlases did not load');})()`);
 const result=await run(`(async()=>{
  const {createSpriteFighters,drawCarSprite,spriteStatus}=await import('/sprites.js');
  const colors=['#a8ff60','#9a94ff','#ff9675','#69deff'],names=['MOSS','ORBIT','EMBER','TIDE'];
  const cars=document.createElement('canvas');cars.width=1200;cars.height=350;const c=cars.getContext('2d');c.fillStyle='#14111c';c.fillRect(0,0,1200,350);
  const carSources=[],originalCar=c.drawImage.bind(c);c.drawImage=(image,...args)=>{carSources.push(image.src);originalCar(image,...args);};
  for(let i=0;i<4;i++){c.save();c.translate(150+i*300,195);c.scale(5,5);drawCarSprite(c,{color:colors[i]});c.restore();c.textAlign='center';c.font='bold 26px Arial';c.fillStyle=colors[i];c.fillText(names[i],150+i*300,60);}
  const umbrella=document.createElement('canvas');umbrella.width=1200;umbrella.height=460;const u=umbrella.getContext('2d');u.fillStyle='#14111c';u.fillRect(0,0,1200,460);
  const umbrellaSources=[],originalUmbrella=u.drawImage.bind(u);u.drawImage=(image,...args)=>{umbrellaSources.push(image.src);originalUmbrella(image,...args);};
  const draw=createSpriteFighters(u);for(let i=0;i<4;i++){u.save();u.translate(150+i*300,390);u.scale(2.5,2.5);draw({id:'u'+i,name:names[i],color:colors[i],x:0,y:0,vx:0,vy:90,face:1,ground:false,umbrella:true,hp:100,lives:3},2+i*.15,.016,2);u.restore();}
  return {status:spriteStatus(),carSources,umbrellaSources,cars:cars.toDataURL(),umbrellas:umbrella.toDataURL()};
 })()`);
 assert.equal(result.status.carFrames,4);assert.equal(result.status.umbrellaFrames,8);
 assert.equal(result.carSources.length,4);assert.ok(result.carSources.every(s=>s.endsWith('/car-sprites.png')));
 assert.equal(result.umbrellaSources.length,4);assert.ok(result.umbrellaSources.every(s=>s.endsWith('/umbrella-sprites.png')));
 await fs.writeFile(path.join(__dirname,'..','nox-racing-sprites-preview.png'),Buffer.from(result.cars.split(',')[1],'base64'));
 await fs.writeFile(path.join(__dirname,'..','nox-umbrella-sprites-preview.png'),Buffer.from(result.umbrellas.split(',')[1],'base64'));
};
