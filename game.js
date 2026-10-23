import {HotPotato} from './potato.js';
import {Arcade} from './arcade.js';
import {Shelfball} from './shelfball.js';
import {CarRace} from './cars.js';
export const COLORS=['#a8ff60','#9a94ff','#ff9675','#69deff'];
export const DEFAULT_PLATFORMS=[{x1:150,y1:470,x2:1130,y2:470},{x1:600,y1:395,x2:680,y2:395,kind:'solid',bottom:470}];
export class Game {
  constructor(platforms=DEFAULT_PLATFORMS){this.platforms=structuredClone(platforms);this.players=[];this.phase='lobby';this.time=0;this.events=[];this.eventId=0;this.mode='brawl';this.cars=new CarRace();this.potato=new HotPotato();this.arcade=new Arcade();this.shelfball=new Shelfball();this.testMode=false;}
  add(name,bot=false){
    if(this.testMode&&['playing','countdown'].includes(this.phase))return null;
    const nameText=String(name||'Fighter').trim().slice(0,18)||'Fighter';
    // Take over the same slot so laps, lives, teams and ball ownership survive a late join.
    const cpu=!bot&&this.players.find(p=>p.bot);
    if(cpu)return Object.assign(cpu,{name:nameText,bot:false,connected:true,input:{},lastInput:0,jumpHeld:false});
    if(this.players.length>=4)return null;
    const slot=this.players.length,p={id:crypto.randomUUID(),name:nameText,color:COLORS.find(c=>!this.players.some(p=>p.color===c)),bot,connected:true,input:{},lastInput:0,lives:3,face:1,unlimitedLives:['cars','pong','shelfball'].includes(this.mode)};
    this.players.push(p);this.spawn(p);
    if(this.mode==='cars')this.cars.spawn(p,slot);
    if(['breakout','pong'].includes(this.mode)){
      this.arcade.spawn(p,slot,this.mode);
      if(this.mode==='breakout'&&this.phase!=='finished')this.arcade.balls.push(this.arcade.ball(p,slot));
    }
    if(this.mode==='shelfball')p.team=slot%2;
    if(this.mode==='potato')this.potato.replace(p,null,this.players);
    return p;
  }
  prepareRound(){
    for(const p of this.players){
      for(const key of ['car','paddle','team','bombScore'])delete p[key];
      p.lives=3;p.unlimitedLives=this.testMode||['cars','pong','shelfball','potato'].includes(this.mode);this.spawn(p);
    }
    if(this.mode==='cars')this.cars.start(this.players);
    if(['breakout','pong'].includes(this.mode))this.arcade.start(this.players,this.mode);
    if(this.mode==='shelfball')this.shelfball.start(this);
    if(this.mode==='potato')this.potato.start(this.players);
    if(this.testMode)for(const p of this.players)p.unlimitedLives=true;
  }
  spawn(p){const s=this.platforms[0],fraction=this.mode==='shelfball'?(this.players.indexOf(p)%2?.75:.25)+(Math.floor(this.players.indexOf(p)/2)-.5)*.15:(this.players.indexOf(p)+1)/5;let x=s.x1+(s.x2-s.x1)*fraction;const floorY=x=>s.y1+(s.y2-s.y1)*(x-s.x1)/(s.x2-s.x1);const blocked=x=>this.platforms.some(o=>o.kind==='solid'&&x>o.x1-14&&x<o.x2+14&&o.y1<floorY(x)&&o.bottom>floorY(x)-66);if(blocked(x)){for(let i=1;i<30;i++){const candidate=s.x1+(s.x2-s.x1)*i/30;if(!blocked(candidate)){x=candidate;break;}}}let y=floorY(x);for(const o of this.platforms)if(o.kind==='solid'&&x>o.x1-14&&x<o.x2+14&&o.y1<y&&o.bottom>y-66)y=o.y1;Object.assign(p,{x,y,vx:0,vy:0,hp:100,inv:2,respawn:0,ground:true,attack:null,cooldown:0,stun:0,blocking:false,jumpHeld:false,airJumpUsed:false,land:0,stride:0,dustTimer:0,umbrella:false,peak:y,hang:null,climb:null,grabCooldown:0,balance:0,balanceV:0,stumble:0,stumbleCooldown:0,input:{}});}
  raceGoal(){return this.platforms.slice(1).filter(s=>Math.max(s.y1,s.y2)<Math.min(this.platforms[0].y1,this.platforms[0].y2)-20).sort((a,b)=>(a.y1+a.y2)-(b.y1+b.y2))[0]||null;}
  setMode(mode){if(this.phase!=='lobby'||!['brawl','race','cars','breakout','pong','shelfball','potato'].includes(mode))return false;this.mode=mode;this.prepareRound();return true;}
  startWithCpu(){
    if(this.phase!=='lobby'||!this.players.some(p=>!p.bot&&p.connected)||(this.mode==='race'&&!this.raceGoal())||(this.mode==='breakout'&&!this.arcade.hasBlocks()))return false;
    const names=['Moss CPU','Orbit CPU','Ember CPU','Tide CPU'];
    while(this.players.length<4)this.add(names[this.players.length],true);
    return this.start();
  }
  lobby(){this.testMode=false;this.phase='lobby';this.time=0;this.winner=null;this.events=[];this.players=this.players.filter(p=>!p.bot);this.prepareRound();}
  nextGame(mode){
    if(!['lobby','finished'].includes(this.phase)||!['brawl','race','cars','breakout','pong','shelfball','potato'].includes(mode)||!this.players.some(p=>!p.bot&&p.connected)||(mode==='race'&&!this.raceGoal())||(mode==='breakout'&&!this.arcade.hasBlocks()))return false;
    this.lobby();this.setMode(mode);return this.startWithCpu();
  }
  startTest(){const humans=this.players.filter(p=>!p.bot&&p.connected);if(this.phase!=='lobby'||humans.length!==1)return false;this.players=humans;return this.start(true);}
  start(testMode=false){if(this.players.length<(testMode?1:2)||(!testMode&&this.mode==='race'&&!this.raceGoal())||(!testMode&&this.mode==='breakout'&&!this.arcade.hasBlocks()))return false;this.testMode=testMode;this.time=0;this.phase='countdown';this.winner=null;this.events=[];this.prepareRound();return true;}
  effect(type,x,y,color,dir=1,power=1){this.events.push({id:++this.eventId,type,x,y,color,dir,power,t:this.time});}
  hit(a,type){if(this.mode==='potato')return;const flying=type==='kick'&&!a.ground;const duration=flying?.48:type==='kick'?.36:.24;a.cooldown=flying?.75:type==='kick'?.6:.32;a.attack={type:flying?'fly':type,start:this.time,until:this.time+duration,targets:[]};a.umbrella=false;this.resolveAttack(a);}
  resolveAttack(a){const attack=a.attack;if(!attack||a.hp<=0||a.stun>0)return;if(this.mode==='shelfball')this.shelfball.kick(this,a,attack);const flying=attack.type==='fly',kick=attack.type==='kick'||flying,range=flying?104:kick?83:60;
    for(const b of this.players){if(b===a||(this.mode==='shelfball'&&a.team===b.team)||b.lives<=0||b.respawn>0||b.hp<=0||b.inv>0||attack.targets.includes(b.id))continue;const dx=b.x-a.x;if(dx*a.face< -8||Math.abs(dx)>=range||Math.abs(b.y-a.y)>65)continue;
      // A real mapped object must also stop a punch or kick through its side.
      if(this.platforms.some(o=>o.kind==='solid'&&o.x1<Math.max(a.x,b.x)&&o.x2>Math.min(a.x,b.x)&&o.y1<a.y-35&&o.bottom>a.y-35))continue;
      attack.targets.push(b.id);const blocked=b.blocking&&b.face*(a.x-b.x)>=0;const knockbackScale=this.mode==='brawl'?.55:1,liftScale=this.mode==='brawl'?.75:1;const damage=blocked?(flying?5:2):(flying?30:kick?23:12);b.hp=Math.max(0,b.hp-damage);b.vx=a.face*(blocked?105:flying?610:kick?440:280)*knockbackScale;b.vy=blocked?Math.min(b.vy,0):(flying?-240:kick?-200:-130)*liftScale;b.stun=blocked?.08:flying?.43:kick?.34:.22;b.inv=blocked?.06:.12;b.attack=null;b.balanceV+=a.face*(blocked?.8:flying?6:kick?4.5:3);if(!blocked){b.blocking=false;b.ground=false;b.hang=null;b.climb=null;b.umbrella=false;b.grabCooldown=.5;}
      this.effect(blocked?'block':flying?'fly':kick?'kick':'hit',b.x-a.face*9,b.y-36,blocked?'#b9e9ff':b.color,a.face,flying?1.6:kick?1.2:1);if(b.hp===0){b.vy=-300*liftScale;b.vx=a.face*500*knockbackScale;}
    }
  }
  step(dt){this.time+=dt;this.events=this.events.filter(e=>this.time-e.t<.8);if(this.phase==='countdown'){if(this.time>=3){this.phase='playing';this.time=0;}return;}if(this.phase!=='playing')return;if(this.mode==='potato'){this.potato.step(this,dt);return;}if(this.mode==='cars'){this.cars.step(this,dt);return;}if(['breakout','pong'].includes(this.mode)){this.arcade.step(this,dt);return;}
    for(const p of this.players){if(p.bot){const target=this.players.filter(q=>q!==p&&q.lives>0&&!q.respawn).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];const d=target?Math.abs(target.x-p.x):999,beat=Math.floor(this.time*3+this.players.indexOf(p));p.input=target?{left:target.x<p.x-42,right:target.x>p.x+42,jump:(p.hang||p.ground||(this.mode==='brawl'&&!p.airJumpUsed&&p.vy>=0))&&(target.y<p.y-30||d<240)&&beat%4===0,punch:d<60,kick:d<100,block:d<110&&!!target.attack&&beat%3===0}:{};if(this.mode==='shelfball'&&this.shelfball.ball){const ball=this.shelfball.ball,goal=p.team===0?1:-1,dx=ball.x-goal*45-p.x;p.input={left:dx< -12,right:dx>12,jump:p.ground&&ball.y<p.y-70,kick:Math.abs(dx)<20&&Math.abs(ball.x-p.x)<95};p.face=goal;}if(this.mode==='race'){const next=this.platforms.filter(s=>Math.min(s.y1,s.y2)<p.y-12).sort((a,b)=>Math.abs(a.y1-p.y)-Math.abs(b.y1-p.y))[0];if(next){const center=(next.x1+next.x2)/2;p.input.left=center<p.x-8;p.input.right=center>p.x+8;p.input.jump=!!(p.hang||p.ground)&&beat%3===0;}}}p.blocking=!!(p.connected&&p.input.block&&p.hp>0&&p.lives>0&&!p.respawn&&p.stun<=0&&!p.attack&&!p.hang&&!p.climb);}
    for(const p of this.players){if(p.lives<=0)continue;if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0)this.spawn(p);continue;}for(const key of ['inv','stun','land','cooldown','dustTimer','grabCooldown','stumble','stumbleCooldown'])p[key]=Math.max(0,p[key]-dt);if(p.attack&&p.attack.until<this.time)p.attack=null;
      const i=p.connected||p.bot?p.input:{},dir=(i.right?1:0)-(i.left?1:0),jumpPressed=i.jump&&!p.jumpHeld;p.jumpHeld=!!i.jump;
      if(p.climb){const c=p.climb;c.t+=dt;const progress=Math.min(1,c.t/.42),ease=progress*progress*(3-2*progress);p.x=c.x+(c.toX-c.x)*ease;p.y=c.y+(c.toY-c.y)*ease;p.vx=p.vy=0;if(progress===1){p.climb=null;p.ground=true;p.airJumpUsed=false;p.peak=p.y;p.land=.15;}continue;}
      if(p.hang){p.umbrella=false;p.vx=p.vy=0;const o=this.platforms[p.hang.index],side=p.hang.side;if(jumpPressed){const toX=side<0?o.x1+20:o.x2-20;const blocked=this.platforms.some(s=>s!==o&&s.kind==='solid'&&toX+12>s.x1&&toX-12<s.x2&&o.y1>s.y1&&o.y1-66<s.bottom);if(!blocked){p.climb={x:p.x,y:p.y,toX,toY:o.y1,t:0};p.hang=null;}}else if(i.block||dir===side){p.hang=null;p.grabCooldown=.45;p.vx=side*100;}if(p.hang||p.climb)continue;}
      if(p.hp>0&&p.stun<=0){const movementScale=this.mode==='brawl'?.75:1,speed=(p.blocking?90:p.umbrella?180:300)*movementScale;if(dir){if(!p.attack)p.face=dir;p.vx+=dir*(p.ground?1600:850)*movementScale*dt;p.vx=Math.max(-speed,Math.min(speed,p.vx));}else p.vx*=Math.exp(-(p.ground?10:1.1)*dt);
        // One fresh press in midair gives Brawl a recovery jump, even after walking off an edge.
        if(jumpPressed&&!p.blocking&&(p.ground||(this.mode==='brawl'&&!p.airJumpUsed))){const airborne=!p.ground;p.airJumpUsed=airborne;p.vy=this.mode==='brawl'?(airborne?-360:-400):-550;p.peak=p.y;p.ground=false;p.umbrella=false;this.effect('dust',p.x,p.y,airborne?p.color:'#b2b7a6',-p.face,airborne?1:.8);}
        if(!p.cooldown&&!p.blocking){if(i.kick)this.hit(p,'kick');else if(i.punch)this.hit(p,'punch');}
      }else p.vx*=Math.exp(-(p.ground?4:.5)*dt);
      const oldX=p.x,oldY=p.y,wasGround=p.ground;p.peak=Math.min(p.peak,p.y);p.umbrella=p.hp>0&&!p.ground&&!p.stun&&p.vy>0&&p.y-p.peak>140&&p.attack?.type!=='fly';p.vy+=1250*dt;if(p.umbrella)p.vy=Math.min(p.vy,115);p.x+=p.vx*dt;p.y+=p.vy*dt;p.ground=false;p.stride+=Math.abs(p.vx)*dt/23;
      if(p.hp>0){for(const [index,o]of this.platforms.entries()){if(o.kind!=='solid')continue;const overlapY=p.y>o.y1+3&&p.y-66<o.bottom;if(overlapY){let side=0;if(oldX+12<=o.x1+1&&p.x+12>o.x1)side=-1;else if(oldX-12>=o.x2-1&&p.x-12<o.x2)side=1;if(side){p.x=side<0?o.x1-12:o.x2+12;p.vx=0;if(!wasGround&&dir===-side&&!p.grabCooldown&&!p.stun&&Math.abs(p.y-58-o.y1)<25){p.hang={index,side};p.x=side<0?o.x1-12:o.x2+12;p.y=o.y1+58;p.face=-side;p.vy=0;p.attack=null;p.umbrella=false;break;}}}
        if(p.x+10>o.x1&&p.x-10<o.x2&&p.vy<0&&oldY-66>=o.bottom&&p.y-66<o.bottom){p.y=o.bottom+66;p.vy=0;}}
        if(!p.hang&&p.vy>=0){for(const s of [...this.platforms].sort((a,b)=>a.y1-b.y1)){if(p.x<s.x1||p.x>s.x2)continue;const sy=s.y1+(s.y2-s.y1)*(p.x-s.x1)/(s.x2-s.x1);const oldSurfaceY=s.y1+(s.y2-s.y1)*(oldX-s.x1)/(s.x2-s.x1),walkingOn=wasGround&&oldX>=s.x1&&oldX<=s.x2&&Math.abs(oldY-oldSurfaceY)<3;if(walkingOn||(oldY<=sy+3&&p.y>=sy)){if(!wasGround&&p.vy>100){p.land=.18;p.balanceV+=Math.sign(p.vx||p.face)*Math.min(2.2,p.vy/260);this.effect('dust',p.x,sy,'#b2b7a6',1,Math.min(2,p.vy/400));}p.y=sy;p.vy=0;p.ground=true;p.airJumpUsed=false;p.umbrella=false;p.peak=p.y;break;}}}
      }
      if(p.ground&&Math.abs(p.vx)>100&&!p.dustTimer){this.effect('dust',p.x,p.y,'#9aa28e',-Math.sign(p.vx),.35);p.dustTimer=.13;}
      const lean=p.vx/300*.18;p.balanceV+=((lean-p.balance)*20-p.balanceV*4)*dt;p.balance+=p.balanceV*dt;p.balance=Math.max(-1.2,Math.min(1.2,p.balance));if(p.ground&&Math.abs(p.balance)>.52&&!p.stumbleCooldown){p.stumble=.48;p.stumbleCooldown=1;p.stun=Math.max(p.stun,.32);p.vx+=Math.sign(p.balance)*85;p.balanceV-=Math.sign(p.balance)*2;this.effect('dust',p.x,p.y,'#b2b7a6',-Math.sign(p.balance),.7);}
      if(p.attack)this.resolveAttack(p);
      if(p.y>850||p.x< -220||p.x>1500){if(!p.unlimitedLives)p.lives--;p.hp=0;p.input={};p.attack=null;p.hang=null;p.climb=null;p.umbrella=false;if(p.lives>0)p.respawn=1.3;}
    }
    if(this.mode==='shelfball'){this.shelfball.step(this,dt);return;}if(this.testMode)return;
    const alive=this.players.filter(p=>p.lives>0);
    if(this.mode==='race'){
      const goal=this.raceGoal();const winners=goal?alive.filter(p=>p.ground&&!p.respawn&&p.hp>0&&p.x>=goal.x1&&p.x<=goal.x2&&Math.abs(p.y-(goal.y1+(goal.y2-goal.y1)*(p.x-goal.x1)/(goal.x2-goal.x1)))<3):[];
      if(winners.length){this.phase='finished';this.winner=winners.length===1?winners[0].name:'Joint finishers';}
      else if(!alive.length){this.phase='finished';this.winner='Nobody';}
    }else if(alive.length<=1){this.phase='finished';this.winner=alive[0]?.name||'Nobody';}
  }
  snapshot(){return {track:this.cars.track,breakoutLayout:this.arcade.layout,...(this.mode==='cars'?this.cars.snapshot(this.time):{}),...(this.mode==='potato'?this.potato.snapshot(['playing','finished'].includes(this.phase)?this.time:0):{}),...(['breakout','pong'].includes(this.mode)?this.arcade.snapshot():{}),...(this.mode==='shelfball'?this.shelfball.snapshot():{}),phase:this.phase,time:this.time,mode:this.mode,testMode:this.testMode,goal:this.mode==='race'?this.raceGoal():null,players:this.players.map(({input,lastInput,...p})=>({...p,attack:p.attack?{type:p.attack.type,start:p.attack.start,until:p.attack.until}:null})),platforms:this.platforms,events:this.events,winner:this.winner};}
}
