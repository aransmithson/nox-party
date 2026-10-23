import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {ArenaStore,validatePlatforms} from './arenas.js';
import {networkInterfaces,hostname} from 'node:os';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {WebSocketServer,WebSocket} from 'ws';
import QRCode from 'qrcode';
import {Game,DEFAULT_PLATFORMS} from './game.js';
const root=path.dirname(fileURLToPath(import.meta.url));
let port=Number(process.env.PORT||3000);const hostToken=crypto.randomUUID(),room=String(Math.floor(1000+Math.random()*9000));
const addresses=()=>Object.entries(networkInterfaces()).flatMap(([name,items])=>items.filter(x=>x.family==='IPv4'&&!x.internal).map(x=>({...x,name}))).sort((a,b)=>{const rank=x=>(/virtual|vethernet|vpn|radmin|wsl|hyper-v/i.test(x.name)?10:0)+(/^192\.168\./.test(x.address)?0:/^10\./.test(x.address)?1:2);return rank(a)-rank(b);}).map(x=>`http://${x.address}:${port}`);
const arenaStore=new ArenaStore(process.env.ARENA_DATA_DIR||root);
const platforms=await arenaStore.loadCurrent(DEFAULT_PLATFORMS);let arenaBusy=false;
const game=new Game(platforms), sessions=new Map();game.cars.track=await arenaStore.loadTrack();game.arcade.layout=await arenaStore.loadBreakout();
function local(req){return ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress);}
function trustedRequest(req){
  try{
    const target=new URL('http://'+req.headers.host);
    const hosts=new Set(['localhost','127.0.0.1','[::1]',hostname().toLowerCase(),...Object.values(networkInterfaces()).flat().filter(Boolean).map(i=>i.address.toLowerCase())]);
    return hosts.has(target.hostname.toLowerCase())&&(!req.headers.origin||new URL(req.headers.origin).origin===target.origin);
  }catch{return false;}
}
const server=http.createServer(async(req,res)=>{try{if(!trustedRequest(req)){res.writeHead(403);return res.end('Local game access only');}const url=new URL(req.url,'http://localhost');if(url.pathname==='/api/info'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({room,addresses:addresses()}));}if(url.pathname==='/qr'){const available=addresses(),base=available.find(a=>a===url.searchParams.get('base'))||available[0]||`http://localhost:${port}`;res.setHeader('Content-Type','image/svg+xml');return res.end(await QRCode.toString(`${base}/controller?room=${room}`,{type:'svg',margin:1,color:{dark:'#11141b',light:'#ffffff'}}));}
const files={'/':'index.html','/controller':'controller.html','/style.css':'style.css','/desk.css':'desk.css','/desk-ui.js':'desk-ui.js','/sprites.js':'sprites.js','/sprite-data.js':'sprite-data.js','/extra-sprite-data.js':'extra-sprite-data.js','/car-sprites.png':'car-sprites.png','/umbrella-sprites.png':'umbrella-sprites.png','/potato-renderer.js':'potato-renderer.js','/brawler-orbit.png':'brawler-orbit.png','/brawler-ember.png':'brawler-ember.png','/brawler-tide.png':'brawler-tide.png','/maze-characters.png':'maze-characters.png','/brawler-sprites.png':'brawler-sprites.png','/maze-sprites.png':'maze-sprites.png','/host.js':'host.js','/controller.js':'controller.js','/projector':'projector.html','/projector.js':'projector.js','/renderer.js':'renderer.js','/car-renderer.js':'car-renderer.js','/sounds.js':'sounds.js','/nox-party-logo.png':'nox-party-logo.png','/arcade-layout.js':'arcade-layout.js','/arcade-renderer.js':'arcade-renderer.js'};const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}let content=await readFile(path.join(root,'public',file));if(file==='index.html'){if(!local(req)){res.writeHead(302,{Location:'/controller'});return res.end();}content=content.toString().replace('__HOST_TOKEN__',hostToken);}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'text/javascript');res.setHeader('Cache-Control','no-store');res.end(content);}catch{res.writeHead(500);res.end('Unable to load game');}});
const wss=new WebSocketServer({noServer:true,maxPayload:8192});
server.on('upgrade',(req,socket,head)=>{
  if(!trustedRequest(req)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
heartbeat.unref();wss.on('close',()=>clearInterval(heartbeat));
let hostPlayerId=null;
function ensurePhoneHost(){if(!game.players.some(p=>p.id===hostPlayerId&&!p.bot&&p.connected))hostPlayerId=game.players.find(p=>!p.bot&&p.connected)?.id||null;}
const send=(ws,data)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
wss.on('connection',(ws,req)=>{ws.admin=false;ws.alive=true;ws.on('pong',()=>{ws.alive=true;});ws.on('error',()=>{ws.terminate();});ws.on('message',async raw=>{try{const m=JSON.parse(raw);if(!m||typeof m!=='object'||Array.isArray(m))return send(ws,{type:'error',message:'Invalid request.'});if(m.type==='host'&&local(req)&&m.token===hostToken){ws.admin=true;return;}if(m.type==='join'){if(ws.player)return;if(m.room!==room)return send(ws,{type:'error',message:'Check the four-digit room code on the PC.'});let p=sessions.get(m.session);if(p&&!game.players.includes(p)){sessions.delete(m.session);p=null;}if(p){for(const other of wss.clients)if(other!==ws&&other.player===p){other.player=null;other.close(4001,'Controller opened elsewhere');}}else {p=game.add(m.name);if(!p)return send(ws,{type:'error',message:game.testMode?'Solo map test is running. Return to the lobby to join.':'All four places are occupied by human players. Ask the host to free a place in the lobby.'});m.session=crypto.randomUUID();sessions.set(m.session,p);}ws.player=p;p.connected=true;ensurePhoneHost();return send(ws,{type:'joined',id:p.id,session:m.session,color:p.color,name:p.name});}
if(m.type==='input'&&ws.player){const p=ws.player;p.input=Object.fromEntries(['left','right','jump','punch','kick','block','gas','reverse','brake','fire','up','down','sprint'].map(k=>[k,m[k]===true]));if(Number.isFinite(m.paddle))p.input.paddle=Math.max(0,Math.min(1,m.paddle));p.lastInput=Date.now();return;}
if(m.type==='next-game'||m.type==='test-start'||m.type==='end-test'){
  if(!ws.admin&&(!ws.player||ws.player.id!==hostPlayerId)){send(ws,{type:'error',message:'Only the host can choose the next game.'});return;}
  if(m.type==='end-test'){if(game.testMode)game.lobby();return;}
  if(arenaBusy||[...wss.clients].some(c=>c.admin&&c.editing)){send(ws,{type:'error',message:'Finish saving or editing the arena first.'});return;}
  if(m.type==='test-start'?!game.startTest():!game.nextGame(m.mode))send(ws,{type:'error',message:m.type==='test-start'?'Solo testing needs exactly one connected phone in the lobby.':m.mode==='breakout'&&!game.arcade.hasBlocks()?'Draw at least one block shape before starting Brick Breakers.':'Choose the next game in the lobby or after the round ends. Parkour needs a finish platform above the mantel.'});
  return;
}
if(!ws.admin)return;
if(m.type==='editing'){ws.editing=m.enabled===true&&game.phase==='lobby';return;}
if(m.type==='arena-list'){send(ws,{type:'arena-list',arenas:await arenaStore.list()});return;}
if(arenaBusy&&['start','demo','lobby','remove','platforms','arena-load','arena-save','track','breakout','mode'].includes(m.type)){send(ws,{type:'error',message:'An arena operation is still finishing. Please try again.'});return;}
if([...wss.clients].some(c=>c.admin&&c.editing)&&( ['start','demo','mode','lobby','remove','arena-load'].includes(m.type)||!ws.editing&&['platforms','track','breakout'].includes(m.type))){send(ws,{type:'error',message:'Finish or discard the open arena edits first.'});return;}
if(['arena-save','arena-load','platforms','track','breakout'].includes(m.type)){
  if(game.phase!=='lobby'){send(ws,{type:'error',message:'Return to the lobby before saving or loading arenas.'});return;}
  arenaBusy=true;
  try{
    if(m.type==='arena-save'){
      const arena=await arenaStore.save({id:m.id,name:m.name,platforms:m.platforms,track:m.track,breakout:m.breakout,mode:m.mode});
      send(ws,{type:'arena-saved',id:arena.id,name:arena.name,arenas:await arenaStore.list()});
    }else if(m.type==='breakout'){await arenaStore.saveBreakout(m.breakout);game.arcade.layout=await arenaStore.loadBreakout();game.arcade.start(game.players,game.mode);send(ws,{type:'breakout-saved',breakout:game.arcade.layout});
    }else if(m.type==='track'){await arenaStore.saveTrack(m.track);game.cars.track=await arenaStore.loadTrack();send(ws,{type:'track-saved',track:game.cars.track});
    }else{
      const arena=m.type==='arena-load'?await arenaStore.get(m.id):null;
      const geometry=arena?arena.platforms:validatePlatforms(m.platforms);
      await arenaStore.saveCurrent(geometry);
      game.platforms=geometry;if(arena?.track){await arenaStore.saveTrack(arena.track);game.cars.track=arena.track;}if(arena?.breakout){await arenaStore.saveBreakout(arena.breakout);game.arcade.layout=arena.breakout;}if(arena?.mode)game.setMode(arena.mode);else game.players.forEach(p=>game.spawn(p));
      send(ws,{type:arena?'arena-loaded':'saved',name:arena?.name,id:arena?.id,platforms:geometry,track:game.cars.track,breakout:game.arcade.layout,mode:game.mode});
    }
  }catch(error){send(ws,{type:'error',message:error.message});}finally{arenaBusy=false;}
  return;
}
if(m.type==='mode'){if(!game.setMode(m.mode))send(ws,{type:'error',message:'Choose a game mode in the lobby.'});}
if(m.type==='start'&&!game.startWithCpu())send(ws,{type:'error',message:game.mode==='breakout'?'Draw at least one block shape and join with one phone before starting.':game.mode==='race'?'Join with one phone and add a platform above the main mantel to start a race.':'Join with at least one phone and return to the lobby to start. Empty slots will use CPUs.'});
if(m.type==='demo'&&game.phase==='lobby'){while(game.players.length<4)game.add(['Moss','Orbit','Ember','Tide'][game.players.length],true);if(!game.start())send(ws,{type:'error',message:'Add a platform above the main mantel to play Race to the Top.'});}
if(m.type==='lobby')game.lobby();
if(m.type==='remove'&&game.phase==='lobby'){const p=game.players.find(p=>p.id===m.id);game.players=game.players.filter(q=>q!==p);for(const [key,value]of sessions)if(value===p)sessions.delete(key);for(const c of wss.clients)if(c.player===p){c.player=null;send(c,{type:'removed'});c.close();}}

}catch{send(ws,{type:'error',message:'Request could not be processed.'});}});ws.on('close',()=>{if(ws.player){ws.player.connected=false;ws.player.input={};ensurePhoneHost();}});});
let tick=0,last=performance.now(),accumulator=0;setInterval(()=>{const now=performance.now();accumulator+=Math.min(.1,(now-last)/1000);last=now;for(const p of game.players)if(!p.bot&&Date.now()-p.lastInput>600)p.input={};while(accumulator>=1/60){game.step(1/60);accumulator-=1/60;}if(++tick%2===0){ensurePhoneHost();const s=JSON.stringify({type:'state',hostPlayerId,setupBusy:arenaBusy||[...wss.clients].some(c=>c.admin&&c.editing),...game.snapshot()});for(const ws of wss.clients)if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<65536)ws.send(s);}},1000/60);
server.listen(port,'0.0.0.0',()=>{port=server.address().port;console.log(`Nox Party: http://localhost:${port}\nPhones: ${addresses().join(', ')}\nRoom: ${room}`);});
