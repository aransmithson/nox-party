import {MazeArena,MAZE} from './maze.js';
export function randomArena(seed=Math.floor(Math.random()*0xffffffff)){
 let n=seed>>>0||1;const random=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
 const cells=Array.from({length:9},(_,r)=>Array.from({length:19},(_,c)=>r===0||r===8||c===0||c===18?'#':'.'));
 const connected=()=>{const seen=new Set(['1,1']),queue=[[1,1]];for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(cells[b]?.[a]==='.'&&!seen.has(k)){seen.add(k);queue.push([a,b]);}}}return seen.size===cells.flat().filter(c=>c==='.').length;};
 for(let i=0;i<26;i++){const x=2+Math.floor(random()*15),y=2+Math.floor(random()*5);if(cells[y][x]==='#')continue;cells[y][x]='#';if(!connected())cells[y][x]='.';}
 return {...structuredClone(MAZE),rows:cells.map(row=>row.join('')),seed};
}
export class HotPotato{
 constructor(){this.arena=new MazeArena(randomArena());this.holderId=null;this.fuse=0;this.passCooldown=0;this.duration=90;this.lastBurst=null;}
 spawn(p,others=[]){const score=p.bombScore??0;this.arena.spawn(p,others);p.bombScore=score;p.unlimitedLives=true;}
 start(players){this.arena=new MazeArena(randomArena());players.forEach((p,i)=>{p.bombScore=0;this.spawn(p,players.slice(0,i));});this.lastBurst=null;this.assign(players);}
 assign(players,avoid){const choices=players.filter(p=>p.id!==avoid);this.holderId=(choices.length?choices:players)[Math.floor(Math.random()*(choices.length||players.length))]?.id||null;this.fuse=12+Math.random()*4;this.passCooldown=1.2;this.arena.plans.clear();}
 replace(p,old,players){this.spawn(p,players.filter(q=>q!==p));p.bombScore=old?.bombScore??0;if(old?.id===this.holderId)this.holderId=p.id;if(!this.holderId)this.assign(players);}
 step(game,dt){
  this.passCooldown=Math.max(0,this.passCooldown-dt);let holder=game.players.find(p=>p.id===this.holderId);if(!holder){this.assign(game.players);holder=game.players.find(p=>p.id===this.holderId);}if(!holder)return;
  const botGame={time:game.time,players:game.players.map(p=>({...p,chaser:p.id===this.holderId}))};
  for(const p of game.players){p.inv=Math.max(0,p.inv-dt);const input=p.bot?this.arena.botInput({...p,chaser:p.id===this.holderId},botGame):p.connected?p.input:{};
   const dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up),length=Math.hypot(dx,dy),running=input.sprint&&length>0&&p.stamina>0;
   p.stamina=Math.max(0,Math.min(3,p.stamina+(running?-1:.65)*dt));const speed=(p.id===this.holderId?190:170)*(running?1.42:1);p.vx=length?dx/length*speed:0;p.vy=length?dy/length*speed:0;
   const steps=Math.max(1,Math.ceil(speed*dt/6));for(let i=0;i<steps;i++){const x=p.x+p.vx*dt/steps,y=p.y+p.vy*dt/steps;if(this.arena.free(x,p.y))p.x=x;if(this.arena.free(p.x,y))p.y=y;}
   if(length){p.angle=Math.atan2(dy,dx);p.stride+=speed*dt/12;}
  }
  this.fuse=Math.max(0,this.fuse-dt);
  if(this.fuse<=0){holder.bombScore=(holder.bombScore||0)-1;this.lastBurst={name:holder.name,score:holder.bombScore};game.effect('popcorn',holder.x,holder.y,'#fff0b2',1,2);this.spawn(holder,game.players.filter(p=>p!==holder));this.assign(game.players,holder.id);}
  else if(this.passCooldown<=0){const target=game.players.find(p=>p!==holder&&p.inv<=0&&Math.hypot(p.x-holder.x,p.y-holder.y)<34&&this.arena.clearLine(p,holder));if(target){this.holderId=target.id;this.passCooldown=.85;this.arena.plans.clear();game.effect('pass',target.x,target.y,'#ffd16b');}}
  if(!game.testMode&&game.time>=this.duration){const score=Math.max(...game.players.map(p=>p.bombScore||0)),winners=game.players.filter(p=>(p.bombScore||0)===score);game.phase='finished';game.winner=winners.map(p=>p.name).join(' & ');}
 }
 snapshot(time){return {maze:this.arena.maze,bomb:{holderId:this.holderId,fuse:this.fuse,remaining:Math.max(0,Math.ceil(this.duration-time)),lastBurst:this.lastBurst}};}
}
