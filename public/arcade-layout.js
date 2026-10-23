export const DEFAULT_BREAKOUT={ground:630,shapes:[{kind:'rect',x:160,y:145,w:960,h:150}]};
export function blockShapeHandles(s){return [['nw',s.x,s.y],['ne',s.x+s.w,s.y],['sw',s.x,s.y+s.h],['se',s.x+s.w,s.y+s.h]];}
export function resizeBlockShape(s,corner,p,ground){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let left=s.x,right=s.x+s.w,top=s.y,bottom=s.y+s.h;
  if(corner.includes('w'))left=clamp(p.x,35,right-32);else right=clamp(p.x,left+32,1245);
  if(corner.includes('n'))top=clamp(p.y,90,bottom-20);else bottom=clamp(p.y,top+20,ground-60);
  return {...s,x:left,y:top,w:right-left,h:bottom-top};
}
export function validateBreakout(layout){
  if(!layout||!Number.isFinite(layout.ground)||layout.ground<250||layout.ground>690||!Array.isArray(layout.shapes)||layout.shapes.length>20)throw new Error('Choose a ground level from 250 to 690 and up to 20 block shapes.');
  if(!layout.shapes.every(s=>s&&['rect','ellipse','triangle'].includes(s.kind)&&['x','y','w','h'].every(k=>Number.isFinite(s[k]))&&s.x>=35&&s.y>=90&&s.w>=32&&s.h>=20&&s.x+s.w<=1245&&s.y+s.h<=layout.ground-60))throw new Error('Keep block shapes inside the arena and at least 60 units above the ground.');
  return {ground:layout.ground,shapes:layout.shapes.map(s=>({kind:s.kind,x:s.x,y:s.y,w:s.w,h:s.h}))};
}
export function makeBricks(layout){
  const blocks=[],occupied=new Set();
  for(const s of layout.shapes)for(let y=s.y;y+20<=s.y+s.h;y+=28)for(let x=s.x;x+32<=s.x+s.w;x+=52){
    const w=Math.min(48,s.x+s.w-x),h=Math.min(22,s.y+s.h-y),cx=x+w/2,cy=y+h/2,nx=(cx-s.x-s.w/2)/(s.w/2),ny=(cy-s.y)/s.h;
    if(s.kind==='ellipse'&&nx*nx+(ny*2-1)**2>1||s.kind==='triangle'&&Math.abs(nx)>ny)continue;
    const k=`${Math.round(cx/26)},${Math.round(cy/14)}`;if(occupied.has(k))continue;occupied.add(k);
    blocks.push({id:blocks.length+1,x,y,w,h,color:['#c1f67a','#9a94ff','#ff9675','#69deff'][Math.floor(y/28)%4]});
  }
  return blocks.slice(0,500);
}
