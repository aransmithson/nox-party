import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
import {HotPotato,randomArena} from '../potato.js';
import {MazeArena} from '../maze.js';
function match(){const g=new Game();g.setMode('potato');for(let i=0;i<4;i++)g.add('P'+i);g.start();g.phase='playing';g.players.forEach(p=>p.inv=0);return g;}
test('random bomb arenas vary, remain connected and have safe spread-out spawns',()=>{
 assert.notDeepEqual(randomArena(123).rows,randomArena(456).rows);
 for(let seed=1;seed<=30;seed++){const arena=new MazeArena(randomArena(seed));assert.equal(arena.distances(arena.floor[0]).size,arena.floor.length);assert.ok(arena.walls.length>52);const players=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];players.forEach((p,i)=>arena.spawn(p,players.slice(0,i)));assert.ok(players.every(p=>arena.free(p.x,p.y)));}
});
test('tagging transfers the same ticking bomb once, with a handoff cooldown',()=>{
 const g=match(),h=g.players.find(p=>p.id===g.potato.holderId),target=g.players.find(p=>p!==h);Object.assign(target,{x:h.x,y:h.y});g.potato.passCooldown=0;g.potato.fuse=5;g.step(.01);assert.equal(g.potato.holderId,target.id);assert.ok(g.potato.fuse<5);g.step(.01);assert.equal(g.potato.holderId,target.id);assert.ok(g.events.some(e=>e.type==='pass'));
});
test('a pop loses one point, creates popcorn and immediately respawns without elimination',()=>{
 const g=match(),h=g.players.find(p=>p.id===g.potato.holderId);g.potato.fuse=.01;g.step(.02);assert.equal(h.bombScore,-1);assert.equal(h.hp,100);assert.equal(h.respawn,0);assert.equal(h.lives,3);assert.ok(g.potato.arena.free(h.x,h.y));assert.notEqual(g.potato.holderId,h.id);assert.ok(g.events.some(e=>e.type==='popcorn'));assert.equal(g.phase,'playing');
});
test('bomb round ends by score at ninety seconds and supports joint winners',()=>{
 const g=match();g.players[0].bombScore=-2;g.players[1].bombScore=-1;g.time=89.99;g.potato.fuse=10;g.step(.02);assert.equal(g.phase,'finished');assert.equal(g.winner,'P2 & P3');
});
test('solo bomb testing keeps playing and CPU replacement preserves holder and score',()=>{
 const g=new Game();g.setMode('potato');const p=g.add('Solo');assert.equal(g.startTest(),true);g.phase='playing';g.potato.fuse=0;g.time=100;g.step(.02);assert.equal(p.bombScore,-1);assert.equal(g.phase,'playing');assert.equal(g.players.length,1);
 g.lobby();g.startWithCpu();const bot=g.players.find(p=>p.bot);bot.bombScore=-3;g.potato.holderId=bot.id;const replacement=g.add('Late phone');assert.equal(replacement.bombScore,-3);assert.equal(g.potato.holderId,replacement.id);
});
