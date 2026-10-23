export class Shelfball {
  constructor(){this.scores=[0,0];this.target=5;this.ball=null;this.effects=[];this.serial=0;}
  floor(game,x){const s=game.platforms[0];return s.y1+(s.y2-s.y1)*(x-s.x1)/(s.x2-s.x1);}
  reset(game){const s=game.platforms[0],x=(s.x1+s.x2)/2;const y=Math.min(this.floor(game,x)-100,...game.platforms.filter(o=>o.kind==='solid'&&x+26>o.x1&&x-26<o.x2).map(o=>o.y1-36));this.ball={x,y,vx:0,vy:0,r:26,spin:0,serve:1};}
  start(game){this.scores=[0,0];this.effects=[];game.players.forEach((p,i)=>p.team=i%2);this.reset(game);}
  effect(type,x,y,time,color='#ffdf92'){this.effects.push({id:++this.serial,type,x,y,color,t:time});}
  kick(game,p,attack){
    const b=this.ball;if(!b||b.serve>0||attack.ballHit)return;
    const dx=b.x-p.x;if(dx*p.face< -b.r||Math.abs(dx)>100||Math.abs(b.y-(p.y-28))>75)return;
    if(game.platforms.some(o=>o.kind==='solid'&&o.x1<Math.max(b.x,p.x)&&o.x2>Math.min(b.x,p.x)&&o.y1<b.y&&o.bottom>b.y))return;
    attack.ballHit=true;const kick=attack.type!=='punch';b.vx=p.face*(kick?740:380)+p.vx*.25;b.vy=kick?-380:-150;b.lastHit=p.id;this.effect(kick?'kick':'hit',b.x,b.y,game.time,p.color);
  }
  step(game,dt){
    this.effects=this.effects.filter(e=>game.time-e.t<.8);const b=this.ball;if(!b)return;if(b.serve>0){b.serve-=dt;return;}
    const s=game.platforms[0],steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*dt/7));
    for(let n=0;n<steps;n++){
      const step=dt/steps,ox=b.x,oy=b.y;b.vy+=1050*step;b.vx*=Math.exp(-.12*step);b.x+=b.vx*step;b.y+=b.vy*step;b.spin+=b.vx*step/b.r;
      const floor=this.floor(game,b.x);
      if((b.x<s.x1-b.r*.2||b.x>s.x2+b.r*.2)&&b.y>floor-120+b.r&&b.y<floor+b.r){const team=b.x>s.x2?0:1;this.scores[team]++;this.effect('goal',b.x,b.y,game.time,team?'#9a94ff':'#c1f67a');this.reset(game);if(!game.testMode&&this.scores[team]>=this.target){game.phase='finished';game.winner=team?'Team Violet':'Team Lime';}return;}
      if(b.x<s.x1+b.r||b.x>s.x2-b.r){const mouth=b.y>floor-120+b.r;if(!mouth){b.x=Math.max(s.x1+b.r,Math.min(s.x2-b.r,b.x));b.vx*=-.78;}}
      for(const o of game.platforms){
        const y=o.y1+(o.y2-o.y1)*(b.x-o.x1)/(o.x2-o.x1);
        if(b.x+b.r>o.x1&&b.x-b.r<o.x2&&oy+b.r<=y+3&&b.y+b.r>=y&&b.vy>0){const impact=b.vy;b.y=y-b.r;b.vy=impact<80?0:-impact*.76;b.vx*=.97;if(impact>110)this.effect('bounce',b.x,b.y,game.time);}
        if(o.kind==='solid'&&b.y+b.r>o.y1&&b.y-b.r<o.bottom){if(ox+b.r<=o.x1&&b.x+b.r>o.x1){b.x=o.x1-b.r;b.vx=-Math.abs(b.vx)*.78;}else if(ox-b.r>=o.x2&&b.x-b.r<o.x2){b.x=o.x2+b.r;b.vx=Math.abs(b.vx)*.78;}if(oy-b.r>=o.bottom&&b.y-b.r<o.bottom){b.y=o.bottom+b.r;b.vy=Math.abs(b.vy)*.78;}}
      }
      for(const p of game.players){if(p.hp<=0||p.respawn>0)continue;const dx=b.x-p.x,dy=b.y-(p.y-28),d=Math.hypot(dx,dy),min=b.r+19;if(d>0&&d<min){const nx=dx/d,ny=dy/d;b.x+=nx*(min-d);b.y+=ny*(min-d);const closing=(b.vx-p.vx)*nx+(b.vy-p.vy)*ny;if(closing<0){b.vx-=nx*closing*1.25;b.vy-=ny*closing*1.25;}}}
      if(b.x>=s.x1&&b.x<=s.x2&&b.y+b.r>this.floor(game,b.x)){b.y=this.floor(game,b.x)-b.r;b.vy=-Math.abs(b.vy)*.5;}
      b.vx=Math.max(-950,Math.min(950,b.vx));b.vy=Math.max(-800,Math.min(1100,b.vy));
      if(b.y>850||b.x< -150||b.x>1430){this.reset(game);return;}
    }
  }
  snapshot(){return {shelfball:this.ball,shelfballEffects:this.effects,teamScores:this.scores,scoreTarget:this.target};}
}
