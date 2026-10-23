import {makeBricks,blockShapeHandles} from './arcade-layout.js';
export function renderArcade(ctx,state,now,{editing=false,selected=0}={}){
  const pong=state.mode==='pong',layout=state.breakoutLayout;
  ctx.save();ctx.lineCap='round';ctx.textAlign='center';
  if(pong){
    ctx.strokeStyle='#415467';ctx.lineWidth=2;ctx.strokeRect(35,100,1210,580);ctx.setLineDash([9,14]);ctx.beginPath();ctx.moveTo(640,100);ctx.lineTo(640,680);ctx.stroke();ctx.setLineDash([]);
    ctx.font='bold 34px Arial';ctx.fillStyle='#c1f67a';ctx.fillText(state.teamScores?.[0]||0,560,65);ctx.fillStyle='#9a94ff';ctx.fillText(state.teamScores?.[1]||0,720,65);ctx.font='12px Arial';ctx.fillStyle='#b9c9bf';ctx.fillText(`DOUBLES PONG · FIRST TO ${state.scoreTarget||7}`,640,86);
  }else if(layout){
    ctx.strokeStyle=editing?'#c1f67a':'#465d72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(35,layout.ground);ctx.lineTo(1245,layout.ground);ctx.stroke();
    for(const b of editing||state.phase==='lobby'?makeBricks(layout):state.blocks||[]){ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=6;ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,4);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#ffffff66';ctx.fillRect(b.x+4,b.y+3,b.w-8,2);}
    if(editing){
      ctx.font='13px Arial';ctx.fillStyle='#c1f67a';ctx.fillText('DRAG GROUND LINE',640,layout.ground+24);
      // Draw every source shape even if it contains no bricks or the brick limit is reached.
      layout.shapes.forEach((s,i)=>{
        const active=i===selected;ctx.strokeStyle=active?'#f4dfff':'#a99bbd';ctx.lineWidth=active?3:1.5;ctx.fillStyle=active?'#bd8aff24':'#bd8aff0c';
        ctx.beginPath();if(s.kind==='ellipse')ctx.ellipse(s.x+s.w/2,s.y+s.h/2,s.w/2,s.h/2,0,0,Math.PI*2);else if(s.kind==='triangle'){ctx.moveTo(s.x+s.w/2,s.y);ctx.lineTo(s.x+s.w,s.y+s.h);ctx.lineTo(s.x,s.y+s.h);ctx.closePath();}else ctx.rect(s.x,s.y,s.w,s.h);ctx.fill();ctx.stroke();
        if(s.kind!=='rect'){ctx.setLineDash([5,5]);ctx.lineWidth=1;ctx.strokeRect(s.x,s.y,s.w,s.h);ctx.setLineDash([]);}
        ctx.font=active?'bold 14px Arial':'13px Arial';ctx.fillStyle=active?'#f4dfff':'#b8a9cb';ctx.fillText(`${i+1} · ${s.kind} · ${Math.round(s.w)} × ${Math.round(s.h)}`,s.x+s.w/2,s.y-14);
      });
      const s=layout.shapes[selected];if(s){ctx.lineWidth=2;ctx.strokeStyle='#f4dfff';for(const [,x,y]of blockShapeHandles(s)){ctx.fillStyle='#67438c';ctx.fillRect(x-7,y-7,14,14);ctx.strokeRect(x-7,y-7,14,14);}}
    }
    ctx.font='bold 22px Arial';ctx.fillStyle='#c1f67a';ctx.fillText('BRICK BREAKERS',640,58);
  }
  if(!editing){for(const p of state.players){const pad=p.paddle;if(!pad)continue;if(p.lives<=0&&!pong&&!state.testMode)continue;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=14;ctx.beginPath();ctx.roundRect(pad.x-pad.w/2,pad.y-pad.h/2,pad.w,pad.h,7);ctx.fill();ctx.shadowBlur=0;ctx.font='bold 12px Arial';ctx.fillText(p.name,pad.x,pad.y-pad.h/2-12);if(!pong){ctx.font='11px Arial';ctx.fillText(`${pad.score} PTS · ${state.testMode?'∞':'●'.repeat(p.lives)}`,pad.x,pad.y+30);}}
    for(const b of state.balls||[]){ctx.strokeStyle=b.color;ctx.lineWidth=b.r;ctx.globalAlpha=.2;ctx.beginPath();ctx.moveTo(b.x-b.vx*.045,b.y-b.vy*.045);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.shadowColor=b.color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
  }
  for(const e of state.arcadeEffects||[]){const age=state.time-e.t,fade=Math.max(0,1-age/.9);ctx.globalAlpha=fade;ctx.fillStyle=e.color;ctx.strokeStyle=e.color;
    if(e.type==='brick'){for(let i=0;i<12;i++){const angle=i*Math.PI*2/12,speed=55+(i*37%110);ctx.save();ctx.translate(e.x+Math.cos(angle)*speed*age,e.y+Math.sin(angle)*speed*age+170*age*age);ctx.rotate(age*(i%2?8:-6));ctx.fillRect(-4,-3,8,6);ctx.restore();}ctx.lineWidth=3*fade;ctx.beginPath();ctx.arc(e.x,e.y,8+age*80,0,Math.PI*2);ctx.stroke();}else{ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,8+age*(e.type==='goal'?220:70),0,Math.PI*2);ctx.stroke();}}
  ctx.globalAlpha=1;ctx.font='bold 27px Arial';ctx.fillStyle='#effbdc';if(state.phase==='countdown')ctx.fillText(Math.max(1,3-Math.floor(state.time)),640,360);if(state.phase==='finished'){ctx.fillText(`Winner: ${state.winner}`,640,360);ctx.font='16px Arial';ctx.fillText('Waiting for host',640,391);}if(state.testMode){ctx.font='13px Arial';ctx.fillText('SOLO TEST · NO OPPONENTS',640,115);}ctx.restore();
}
export function renderShelfball(ctx,state){
  const field=state.platforms[0];if(!field)return;ctx.save();
  for(const [x,y,color,dir]of [[field.x1,field.y1,'#c1f67a',1],[field.x2,field.y2,'#9a94ff',-1]]){ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-120);ctx.lineTo(x+dir*44,y-120);ctx.stroke();ctx.globalAlpha=.3;for(let h=0;h<120;h+=15){ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+dir*44,y-h);ctx.stroke();}ctx.globalAlpha=1;}
  ctx.strokeStyle='#708078';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(field.x1,field.y1);ctx.lineTo(field.x2,field.y2);ctx.stroke();
  const b=state.shelfball;if(b){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.spin);ctx.shadowColor='#ffda7f';ctx.shadowBlur=12;ctx.fillStyle='#ffe3a0';ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#3d3461';ctx.lineWidth=3;for(let i=0;i<3;i++){ctx.rotate(Math.PI*2/3);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(18,7,26,0);ctx.stroke();}ctx.restore();}
  ctx.textAlign='center';ctx.font='bold 28px Arial';ctx.fillStyle='#c1f67a';ctx.fillText(state.teamScores?.[0]||0,575,65);ctx.fillStyle='#9a94ff';ctx.fillText(state.teamScores?.[1]||0,705,65);ctx.fillStyle='#eee8d1';ctx.font='14px Arial';ctx.fillText(`SHELFBALL · FIRST TO ${state.scoreTarget||5}`,640,92);ctx.restore();
}
