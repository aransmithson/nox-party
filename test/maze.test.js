import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
import {MazeArena} from '../maze.js';

function match(){const g=new Game();g.setMode('potato');for(let i=0;i<4;i++)g.add(`Player ${i}`);g.start();g.phase='playing';g.players.forEach(p=>p.inv=0);g.potato.arena=new MazeArena();g.potato.fuse=100;return g;}
test('shared maze has connected corridors, clear and well-separated random spawns',()=>{
  const maze=new MazeArena();assert.equal(maze.distances(maze.floor[0]).size,maze.floor.length);
  for(let n=0;n<20;n++){
    const players=Array.from({length:4},(_,id)=>({id}));maze.start(players);
    for(const p of players){assert.ok(maze.free(p.x,p.y));for(const q of players)if(q!==p)assert.ok(Math.hypot(p.x-q.x,p.y-q.y)>=240);}
  }
});
test('Hot Potato movement normalizes diagonals and cannot cross maze walls',()=>{
  const g=match(),p=g.players[0];g.potato.holderId=p.id;
  Object.assign(p,{x:160,y:220,input:{up:true}});g.step(.05);assert.ok(p.y<220);assert.equal(p.x,160);
  Object.assign(p,{x:160,y:220,input:{right:true,down:true}});g.step(.01);assert.ok(Math.abs(Math.hypot(p.vx,p.vy)-190)<.001);
  Object.assign(p,{x:160,y:220,input:{left:true}});for(let i=0;i<60;i++)g.step(1/60);
  assert.ok(p.x>=145);assert.ok(g.potato.arena.free(p.x,p.y));
  assert.equal(g.potato.arena.clearLine({x:295,y:220},{x:385,y:220}),false);
});
test('Hot Potato CPU still navigates corridor bends and tags another player',()=>{
  const g=match(),[holder,target]=g.players;g.players=[holder,target];holder.bot=true;g.potato.holderId=holder.id;
  Object.assign(holder,{x:160,y:220});Object.assign(target,{x:400,y:220});
  for(let i=0;i<1800&&g.potato.holderId===holder.id;i++)g.step(1/60);
  assert.equal(g.potato.holderId,target.id);assert.ok(g.events.some(e=>e.type==='pass'));
});
test('next game preserves humans, fills CPUs and only runs between rounds',()=>{
  const game=match();assert.equal(game.nextGame('cars'),false);game.phase='finished';game.winner='Player 0';const ids=game.players.map(p=>p.id);
  assert.equal(game.nextGame('cars'),true);assert.equal(game.phase,'countdown');assert.equal(game.mode,'cars');assert.equal(game.winner,null);assert.deepEqual(game.players.map(p=>p.id),ids);assert.ok(game.players.every(p=>p.car));
});
test('removed Infection mode cannot be selected or started through stale clients',()=>{
  const game=match();game.lobby();const before=game.snapshot();assert.equal(game.setMode('infection'),false);assert.deepEqual(game.snapshot(),before);
  for(const phase of ['lobby','finished']){game.phase=phase;const before=game.snapshot();assert.equal(game.nextGame('infection'),false);assert.deepEqual(game.snapshot(),before);}
});
