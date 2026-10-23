export const DEFAULT_TRACK={points:[{x:280,y:540},{x:1000,y:540},{x:1100,y:400},{x:1000,y:180},{x:720,y:150},{x:580,y:310},{x:300,y:200},{x:160,y:330}],width:95,laps:3};
export function validateTrack(track){if(!track||!Array.isArray(track.points)||track.points.length<4||track.points.length>24||!Number.isFinite(track.width)||track.width<50||track.width>160||!Number.isInteger(track.laps)||track.laps<1||track.laps>9||!track.points.every((p,i)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=80&&p.x<=1200&&p.y>=90&&p.y<=630&&Math.hypot(p.x-track.points[(i+1)%track.points.length]?.x,p.y-track.points[(i+1)%track.points.length]?.y)>=55))throw new Error('Track needs 4–24 points, at least 55 units apart, a 50–160 width and 1–9 laps.');return {points:track.points.map(p=>({x:p.x,y:p.y})),width:track.width,laps:track.laps};}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export class CarRace {
  constructor(track=DEFAULT_TRACK){this.track=structuredClone(track);this.items=[];this.effects=[];this.serial=0;this.contacts=new Map();}
  spawn(p,index){const [a,b]=this.track.points,h=Math.atan2(b.y-a.y,b.x-a.x),back=18+Math.floor(index/2)*34,side=index%2?17:-17;p.car={x:a.x-Math.cos(h)*back-Math.sin(h)*side,y:a.y-Math.sin(h)*back+Math.cos(h)*side,vx:0,vy:0,heading:h,lap:0,next:1,item:null,spin:0,fireHeld:false,trail:0};p.lives=3;p.hp=100;p.unlimitedLives=true;}
  start(players){this.items=[];this.effects=[];this.contacts.clear();this.pickups=this.track.points.map((p,i)=>({...p,id:i,ready:0})).filter((_,i)=>i%2===1);players.forEach((p,i)=>this.spawn(p,i));}
  nearest(x,y){let nearest={distance:Infinity,x,y};const points=this.track.points;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1),px=a.x+t*dx,py=a.y+t*dy,d=Math.hypot(x-px,y-py);if(d<nearest.distance)nearest={distance:d,x:px,y:py};}return nearest;}
  burst(x,y,color,t,type='impact'){this.effects.push({id:++this.serial,x,y,color,t,type});}
  contain(c,time){
    const near=this.nearest(c.x,c.y),limit=this.track.width/2-15;
    if(near.distance<=limit)return;
    const nx=(c.x-near.x)/near.distance,ny=(c.y-near.y)/near.distance;
    c.x=near.x+nx*limit;c.y=near.y+ny*limit;
    // A lively rebound preserves speed along the barrier instead of scrubbing it.
    const outward=Math.max(0,c.vx*nx+c.vy*ny);c.vx-=nx*outward*1.8;c.vy-=ny*outward*1.8;
    if(time>=(c.barrierUntil||0)){
      c.barrierUntil=time+.25;
      if(outward>30)this.burst(c.x+nx*14,c.y+ny*14,'#ffe6b1',time,'barrier');
    }
  }
  step(game,dt){const time=game.time;this.effects=this.effects.filter(e=>time-e.t<.65);for(const p of game.players){if(!p.car)this.spawn(p,game.players.indexOf(p));const c=p.car;let input=p.connected?p.input:{};if(p.bot){const target=this.track.points[c.next],diff=angle(Math.atan2(target.y-c.y,target.x-c.x)-c.heading);input={left:diff<-.07,right:diff>.07,gas:true,brake:Math.abs(diff)>.8&&Math.hypot(c.vx,c.vy)>150,fire:!!c.item};}
      c.spin=Math.max(0,c.spin-dt);const steer=(input.right?1:0)-(input.left?1:0),forward=c.vx*Math.cos(c.heading)+c.vy*Math.sin(c.heading),lateral=-c.vx*Math.sin(c.heading)+c.vy*Math.cos(c.heading),speed=Math.hypot(c.vx,c.vy);const near=this.nearest(c.x,c.y),offroad=near.distance>this.track.width/2;
      if(c.spin>0){c.heading+=dt*8;c.vx*=Math.exp(-2*dt);c.vy*=Math.exp(-2*dt);}else{c.heading+=steer*clamp(Math.abs(forward)/100,0,2.5)*(input.brake?1.5:1)*dt*Math.sign(forward||1);const turnedForward=c.vx*Math.cos(c.heading)+c.vy*Math.sin(c.heading),turnedLateral=-c.vx*Math.sin(c.heading)+c.vy*Math.cos(c.heading);const thrust=input.gas===input.reverse?0:input.reverse?-180:input.gas?230:0;const f=clamp(turnedForward+(thrust-turnedForward*(input.brake?2.3:offroad?3.5:.65))*dt,-130,345),lat=turnedLateral*Math.exp(-(input.brake?1.2:offroad?4:7)*dt);c.vx=Math.cos(c.heading)*f-Math.sin(c.heading)*lat;c.vy=Math.sin(c.heading)*f+Math.cos(c.heading)*lat;}
      c.x=clamp(c.x+c.vx*dt,20,1260);c.y=clamp(c.y+c.vy*dt,20,700);this.contain(c,time);c.trail-=dt;if((input.brake||Math.abs(lateral)>55)&&speed>80&&c.trail<=0){this.burst(c.x-Math.cos(c.heading)*15,c.y-Math.sin(c.heading)*15,'#8993a0',time,'skid');c.trail=.045;}
      const target=this.track.points[c.next];if(Math.hypot(c.x-target.x,c.y-target.y)<this.track.width*.55){if(c.next===0){c.lap++;if(!game.testMode&&c.lap>=this.track.laps){game.phase='finished';game.winner=p.name;return;}}c.next=(c.next+1)%this.track.points.length;}
      for(const box of this.pickups)if(time>=box.ready&&!c.item&&Math.hypot(c.x-box.x,c.y-box.y)<27){c.item=Math.random()<.5?'banana':'rocket';box.ready=time+7;this.burst(box.x,box.y,'#ffe39a',time,'pickup');}
      if(input.fire&&!c.fireHeld&&c.item){const rocket=c.item==='rocket',dir=rocket?1:-1;this.items.push({id:++this.serial,type:c.item,owner:p.id,x:c.x+Math.cos(c.heading)*dir*31,y:c.y+Math.sin(c.heading)*dir*31,heading:c.heading,expires:time+(rocket?2:18),born:time});c.item=null;}c.fireHeld=!!input.fire;
    }
    for(let i=0;i<game.players.length;i++)for(let j=i+1;j<game.players.length;j++){const a=game.players[i].car,b=game.players[j].car,dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<27){const nx=d?dx/d:1,ny=d?dy/d:0,push=(27-d)/2;a.x-=nx*push;a.y-=ny*push;b.x+=nx*push;b.y+=ny*push;const pair=game.players[i].id+':'+game.players[j].id,closing=Math.max(0,(a.vx-b.vx)*nx+(a.vy-b.vy)*ny),impulse=time>=(this.contacts.get(pair)||0)?closing*.28:0;if(impulse>0)this.contacts.set(pair,time+.2);a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;if(impulse>40&&time>=(a.collisionUntil||0)){a.collisionUntil=b.collisionUntil=time+.3;this.burst((a.x+b.x)/2,(a.y+b.y)/2,'#ffe6b1',time);}}}
    for(const p of game.players)this.contain(p.car,time);
    for(const item of this.items){if(item.type==='rocket'){item.x+=Math.cos(item.heading)*650*dt;item.y+=Math.sin(item.heading)*650*dt;}for(const p of game.players){if(item.owner===p.id&&time-item.born<.7)continue;const c=p.car;if(item.expires>time&&Math.hypot(c.x-item.x,c.y-item.y)<22){c.spin=item.type==='rocket'?.9:1.2;c.vx*=.45;c.vy*=.45;this.burst(c.x,c.y,item.type==='rocket'?'#ff9f58':'#ffe879',time);item.expires=0;break;}}}this.items=this.items.filter(i=>i.expires>time&&i.x>0&&i.x<1280&&i.y>0&&i.y<720);
  }
  snapshot(time){return {track:this.track,pickups:(this.pickups||[]).filter(p=>time>=p.ready),items:this.items,carEffects:this.effects};}
}
