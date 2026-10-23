const COLS=19,ROWS=9,CELL=60;
const cells=Array.from({length:ROWS},(_,r)=>Array.from({length:COLS},(_,c)=>r===0||c===0||r===ROWS-1||c===COLS-1?'#':'.'));
for(const [c,gaps]of [[4,[2,6]],[8,[3,7]],[12,[1,5]],[16,[3,6]]])for(let r=1;r<ROWS-1;r++)if(!gaps.includes(r))cells[r][c]='#';
export const MAZE={x:70,y:130,cell:CELL,rows:cells.map(r=>r.join(''))};
export const BODY_RADIUS=15;
const key=(c,r)=>`${c},${r}`;

export class MazeArena {
  constructor(maze=MAZE){
    this.maze=structuredClone(maze);this.plans=new Map();
    this.floor=[];this.walls=[];
    this.maze.rows.forEach((row,r)=>[...row].forEach((value,c)=>{
      const point={c,r,x:MAZE.x+(c+.5)*CELL,y:MAZE.y+(r+.5)*CELL};
      if(value==='.')this.floor.push(point);else this.walls.push({x:point.x-CELL/2,y:point.y-CELL/2,w:CELL,h:CELL});
    }));
  }
  at(p){return {c:Math.floor((p.x-MAZE.x)/CELL),r:Math.floor((p.y-MAZE.y)/CELL)};}
  center(p){return {x:MAZE.x+(p.c+.5)*CELL,y:MAZE.y+(p.r+.5)*CELL};}
  neighbors(p){return [[1,0],[-1,0],[0,1],[0,-1]].map(([dc,dr])=>({c:p.c+dc,r:p.r+dr})).filter(n=>this.maze.rows[n.r]?.[n.c]==='.');}
  distances(from){const queue=[from],dist=new Map([[key(from.c,from.r),0]]);for(let i=0;i<queue.length;i++)for(const n of this.neighbors(queue[i]))if(!dist.has(key(n.c,n.r))){dist.set(key(n.c,n.r),dist.get(key(queue[i].c,queue[i].r))+1);queue.push(n);}return dist;}
  path(from,to){const distances=this.distances(to),route=[];let current=from;while(distances.get(key(current.c,current.r))>0){const next=this.neighbors(current).find(n=>distances.get(key(n.c,n.r))===distances.get(key(current.c,current.r))-1);if(!next)break;route.push(this.center(next));current=next;}return route;}
  free(x,y,radius=BODY_RADIUS){return x-radius>=MAZE.x&&y-radius>=MAZE.y&&x+radius<=MAZE.x+COLS*CELL&&y+radius<=MAZE.y+ROWS*CELL&&!this.walls.some(w=>Math.hypot(x-Math.max(w.x,Math.min(x,w.x+w.w)),y-Math.max(w.y,Math.min(y,w.y+w.h)))<radius);}
  clearLine(a,b){const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/8);for(let i=0;i<=steps;i++)if(!this.free(a.x+(b.x-a.x)*i/(steps||1),a.y+(b.y-a.y)*i/(steps||1),1))return false;return true;}
  spawn(p,others=[]){
    const shuffled=this.floor.map(point=>({point,sort:Math.random()})).sort((a,b)=>a.sort-b.sort).map(v=>v.point);
    const separation=point=>others.length?Math.min(...others.map(q=>Math.hypot(point.x-q.x,point.y-q.y))):Infinity;
    const spot=shuffled.find(point=>separation(point)>=240)||shuffled.sort((a,b)=>separation(b)-separation(a))[0];
    Object.assign(p,{x:spot.x,y:spot.y,vx:0,vy:0,angle:Math.random()*Math.PI*2,stamina:3,inv:2,ground:true,stride:0,hp:100,lives:3,respawn:0,unlimitedLives:true,input:{}});
    this.plans.delete(p.id);
  }
  start(players){this.plans.clear();players.forEach((p,i)=>this.spawn(p,players.slice(0,i)));}
  botInput(p,game){
    let plan=this.plans.get(p.id);
    if(!plan||plan.until<game.time||!plan.route.length){
      const from=this.at(p),enemies=game.players.filter(q=>q.chaser!==p.chaser);
      const own=this.distances(from);let goal=from;
      if(p.chaser){goal=enemies.map(q=>this.at(q)).sort((a,b)=>(own.get(key(a.c,a.r))??Infinity)-(own.get(key(b.c,b.r))??Infinity))[0]||from;}
      else if(enemies.length){const danger=enemies.map(q=>this.distances(this.at(q)));goal=this.floor.reduce((best,spot)=>{const score=q=>Math.min(...danger.map(d=>d.get(key(q.c,q.r))??0))-(own.get(key(q.c,q.r))??0)*.25;return score(spot)>score(best)?spot:best;},from);}
      // Reach the middle of the current corridor before turning a corner.
      plan={until:game.time+1.5,route:[this.center(from),...this.path(from,goal)]};this.plans.set(p.id,plan);
    }
    while(plan.route.length&&Math.hypot(plan.route[0].x-p.x,plan.route[0].y-p.y)<4)plan.route.shift();
    const next=plan.route[0];return next?{left:next.x<p.x-2,right:next.x>p.x+2,up:next.y<p.y-2,down:next.y>p.y+2,sprint:p.stamina>1.5}:{};
  }
}
