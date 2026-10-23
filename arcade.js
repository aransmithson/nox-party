import {DEFAULT_BREAKOUT,makeBricks} from './public/arcade-layout.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Arcade {
  constructor(){this.layout=structuredClone(DEFAULT_BREAKOUT);this.blocks=[];this.balls=[];this.effects=[];this.serial=0;this.scores=[0,0];this.target=7;}
  hasBlocks(){return makeBricks(this.layout).length>0;}
  spawn(p,index,mode,previous){
    const team=index%2,rank=Math.floor(index/2);
    p.paddle=mode==='pong'?{x:team?1160-rank*56:120+rank*56,y:rank?490:270,w:14,h:104,team,score:previous?.paddle?.score||0}:{x:160+index*320,y:this.layout.ground,w:104,h:14,team:index,score:previous?.paddle?.score||0};
    if(previous)for(const b of this.balls)if(b.owner===previous.id)b.owner=p.id;
    p.lives=3;p.hp=100;p.unlimitedLives=mode==='pong';
  }
  ball(p,index){return {id:++this.serial,owner:p.id,lastHit:null,x:p.paddle.x,y:this.layout.ground-25,vx:(index%2?1:-1)*(100+index*18),vy:-300,r:8,serve:1,color:p.color};}
  start(players,mode){this.effects=[];this.scores=[0,0];this.blocks=makeBricks(this.layout);players.forEach((p,i)=>this.spawn(p,i,mode));this.balls=mode==='pong'?[{id:++this.serial,x:640,y:380,vx:340,vy:100,r:10,serve:1,color:'#f0f4dd'}]:players.map((p,i)=>this.ball(p,i));}
  effect(type,x,y,color,time,extra={}){this.effects.push({id:++this.serial,type,x,y,color,t:time,...extra});}
  movePaddles(game,dt){
    for(const [i,p]of game.players.entries()){
      if(!p.paddle)this.spawn(p,i,game.mode);const pad=p.paddle,old=game.mode==='pong'?pad.y:pad.x,input=p.connected?p.input:{};let target;
      if(p.bot){const ball=this.balls.filter(b=>game.mode==='pong'||b.owner===p.id).sort((a,b)=>b.y-a.y)[0];target=game.mode==='pong'?ball?.y:ball?.x;}
      else if(Number.isFinite(input.paddle))target=game.mode==='pong'?100+input.paddle*570:60+input.paddle*1160;
      const dir=game.mode==='pong'?Number(!!input.down)-Number(!!input.up):Number(!!input.right)-Number(!!input.left);
      const next=target===undefined?old+dir*560*dt:old+clamp(target-old,-(p.bot?340:1100)*dt,(p.bot?340:1100)*dt);
      if(game.mode==='pong')pad.y=clamp(next,100+pad.h/2,680-pad.h/2);else pad.x=clamp(next,pad.w/2+35,1245-pad.w/2);
      pad.velocity=((game.mode==='pong'?pad.y:pad.x)-old)/dt;
    }
  }
  step(game,dt){
    this.effects=this.effects.filter(e=>game.time-e.t<1);this.movePaddles(game,dt);
    for(const ball of [...this.balls]){
      const owner=game.players.find(p=>p.id===ball.owner);
      if(ball.serve>0){ball.serve-=dt;if(game.mode==='breakout'&&owner){ball.x=owner.paddle.x;ball.y=this.layout.ground-25;}continue;}
      const steps=Math.max(1,Math.ceil(Math.hypot(ball.vx,ball.vy)*dt/6));
      for(let n=0;n<steps;n++){
        const ox=ball.x,oy=ball.y;ball.x+=ball.vx*dt/steps;ball.y+=ball.vy*dt/steps;
        if(game.mode==='pong'){
          if(ball.y<100+ball.r||ball.y>680-ball.r){ball.y=clamp(ball.y,100+ball.r,680-ball.r);ball.vy*=-1;this.effect('bounce',ball.x,ball.y,ball.color,game.time);}
          for(const p of game.players){const pad=p.paddle;if((pad.team===0&&ball.vx>=0)||(pad.team===1&&ball.vx<=0))continue;
            if(ball.x+ball.r>pad.x-pad.w/2&&ball.x-ball.r<pad.x+pad.w/2&&Math.abs(ball.y-pad.y)<pad.h/2+ball.r){
              const dir=pad.team===0?1:-1,speed=Math.min(700,Math.hypot(ball.vx,ball.vy)*1.045),angle=clamp((ball.y-pad.y)/(pad.h/2),-1,1)*.9;
              ball.x=pad.x+dir*(pad.w/2+ball.r+.1);ball.vx=dir*speed*Math.cos(angle);ball.vy=speed*Math.sin(angle)+pad.velocity*.12;this.effect('paddle',ball.x,ball.y,p.color,game.time);break;
            }
          }
          if(game.testMode&&ball.x>1220){ball.x=1220;ball.vx=-Math.abs(ball.vx);}
          if(ball.x<10||ball.x>1270){const team=ball.x<640?1:0;this.scores[team]++;this.effect('goal',640,380,team?'#9a94ff':'#c1f67a',game.time);Object.assign(ball,{x:640,y:380,vx:team?-340:340,vy:(Math.random()-.5)*240,serve:1.2});if(!game.testMode&&this.scores[team]>=this.target){game.phase='finished';game.winner=team?'Team Violet':'Team Lime';}break;}
        }else{
          if(ball.x<35+ball.r||ball.x>1245-ball.r){ball.x=clamp(ball.x,35+ball.r,1245-ball.r);ball.vx*=-1;}
          if(ball.y<90+ball.r){ball.y=90+ball.r;ball.vy=Math.abs(ball.vy);}
          if(ball.vy>0)for(const p of game.players){const pad=p.paddle;if(p.lives<=0&&!game.testMode)continue;
            if(oy+ball.r<=pad.y+pad.h/2&&ball.y+ball.r>=pad.y-pad.h/2&&Math.abs(ball.x-pad.x)<pad.w/2+ball.r){
              const offset=clamp((ball.x-pad.x)/(pad.w/2),-1,1),speed=Math.min(600,Math.hypot(ball.vx,ball.vy)+9);ball.y=pad.y-pad.h/2-ball.r-.1;ball.vx=speed*Math.sin(offset*1.05)+pad.velocity*.1;ball.vy=-Math.max(180,speed*Math.cos(offset*1.05));ball.lastHit=p.id;this.effect('paddle',ball.x,ball.y,p.color,game.time);break;
            }
          }
          const block=this.blocks.find(b=>ball.x+ball.r>b.x&&ball.x-ball.r<b.x+b.w&&ball.y+ball.r>b.y&&ball.y-ball.r<b.y+b.h);
          if(block){this.blocks=this.blocks.filter(b=>b!==block);const scorer=game.players.find(p=>p.id===(ball.lastHit||ball.owner));if(scorer)scorer.paddle.score+=10;
            if(ox+ball.r<=block.x||ox-ball.r>=block.x+block.w){ball.vx*=-1;ball.x=ox;}else{ball.vy*=-1;ball.y=oy;}
            this.effect('brick',block.x+block.w/2,block.y+block.h/2,block.color,game.time,{w:block.w,h:block.h});
          }
          if(ball.y>this.layout.ground+75){if(owner){if(!game.testMode)owner.lives--;if(owner.lives>0||game.testMode)Object.assign(ball,this.ball(owner,game.players.indexOf(owner)));else this.balls=this.balls.filter(b=>b!==ball);}else this.balls=this.balls.filter(b=>b!==ball);break;}
        }
      }
    }
    if(game.mode==='breakout'&&!game.testMode&&(!this.blocks.length||!this.balls.length)){
      const best=Math.max(...game.players.map(p=>p.paddle.score));const winners=game.players.filter(p=>p.paddle.score===best);game.phase='finished';game.winner=winners.length===1?winners[0].name:winners.map(p=>p.name).join(' & ');
    }
  }
  snapshot(){return {breakoutLayout:this.layout,blocks:this.blocks,balls:this.balls,arcadeEffects:this.effects,teamScores:this.scores,scoreTarget:this.target};}
}
