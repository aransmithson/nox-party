import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';

const dt=1/60;
function solo(mode='brawl'){
  const game=new Game([{x1:100,x2:1180,y1:600,y2:600}]);
  game.setMode(mode);const player=game.add('Tester');game.startTest();game.phase='playing';
  return {game,player};
}
function press(game,player){player.input.jump=false;game.step(dt);player.input.jump=true;game.step(dt);}
function land(game,player){player.input={};for(let i=0;i<180&&!player.ground;i++)game.step(dt);assert.equal(player.ground,true);}

test('Brawl hops are about half the height of Parkour and Shelfball jumps',()=>{
  const heights={};
  for(const mode of ['brawl','race','shelfball']){
    const {game,player}=solo(mode),start=player.y;let top=start;
    press(game,player);
    while(player.vy<0){top=Math.min(top,player.y);game.step(dt);}
    heights[mode]=start-top;
  }
  assert.ok(heights.brawl>55&&heights.brawl<65);
  assert.ok(heights.race>110&&heights.race<125);
  assert.equal(heights.shelfball,heights.race);
});

test('release and tap gives one air jump, but a held button or third press cannot fly',()=>{
  const {game,player}=solo();press(game,player);
  for(let i=0;i<25;i++)game.step(dt);
  assert.ok(player.vy>0);assert.equal(player.airJumpUsed,false);
  press(game,player);
  assert.ok(player.vy<-300);assert.equal(player.airJumpUsed,true);
  assert.ok(game.events.some(e=>e.type==='dust'&&e.color===player.color));
  const before=player.vy;press(game,player);
  assert.ok(player.vy>before,'A third press must not reset upward velocity');
  for(let i=0;i<100;i++)game.step(dt);
  assert.equal(player.ground,true);assert.equal(player.vy,0,'Holding jump must not bounce after landing');
  assert.equal(player.airJumpUsed,false);
  press(game,player);assert.ok(player.vy<0);press(game,player);assert.equal(player.airJumpUsed,true);
});

test('landing, respawn and a completed ledge climb restore the air jump',()=>{
  const {game,player}=solo();press(game,player);press(game,player);land(game,player);
  assert.equal(player.airJumpUsed,false);
  player.airJumpUsed=true;game.spawn(player);assert.equal(player.airJumpUsed,false);
  Object.assign(player,{airJumpUsed:true,ground:false,climb:{x:300,y:550,toX:320,toY:500,t:0}});
  for(let i=0;i<26;i++)game.step(dt);
  assert.equal(player.climb,null);assert.equal(player.ground,true);assert.equal(player.airJumpUsed,false);
});

test('walking off an edge allows one recovery jump and closes an open umbrella',()=>{
  const {game,player}=solo();Object.assign(player,{x:1180,vx:225,input:{right:true}});game.step(dt);
  assert.equal(player.ground,false);assert.equal(player.airJumpUsed,false);
  Object.assign(player,{y:650,peak:300,vy:300});player.input={};game.step(dt);
  assert.equal(player.umbrella,true);press(game,player);
  assert.equal(player.umbrella,false);assert.equal(player.airJumpUsed,true);assert.ok(player.vy<0);
  const before=player.vy;press(game,player);assert.ok(player.vy>before);
});

test('dead, stunned or guarding fighters cannot trigger an air jump',()=>{
  for(const condition of [{hp:0},{stun:1},{input:{block:true}}]){
    const {game,player}=solo();Object.assign(player,{y:400,peak:400,vy:50,ground:false},condition);
    player.input.jump=true;game.step(dt);assert.ok(player.vy>50);assert.equal(player.airJumpUsed,false);
  }
});

test('Parkour and Shelfball still use a single jump',()=>{
  for(const mode of ['race','shelfball']){
    const {game,player}=solo(mode);press(game,player);const before=player.vy;
    press(game,player);assert.ok(player.vy>before);
  }
});

test('Brawl punches, kicks, flying kicks and knockouts send opponents a shorter distance',()=>{
  for(const attack of ['punch','kick','fly','knockout','block']){
    const results={};
    for(const mode of ['brawl','race']){
      const game=new Game([{x1:100,x2:1180,y1:600,y2:600}]);game.setMode(mode);
      const a=game.add('A'),b=game.add('B');game.start(true);game.phase='playing';
      Object.assign(a,{x:400,y:600,face:1,ground:attack!=='fly'});
      Object.assign(b,{x:440,y:600,face:-1,inv:0,hp:attack==='knockout'?1:100,blocking:attack==='block',airJumpUsed:true});
      game.hit(a,attack==='punch'||attack==='block'?'punch':'kick');
      const initial={vx:b.vx,vy:b.vy,hp:b.hp};
      assert.equal(b.airJumpUsed,true,'Getting hit must not replenish a jump');
      for(let i=0;i<18;i++)game.step(dt);
      results[mode]={...initial,distance:b.x-440};
    }
    assert.ok(Math.abs(results.brawl.vx/results.race.vx-.55)<.001,attack);
    assert.equal(results.brawl.hp,results.race.hp,'Damage stays the same');
    if(attack!=='block')assert.ok(Math.abs(results.brawl.vy/results.race.vy-.75)<.001);
    assert.ok(results.brawl.distance<results.race.distance*.8,attack+' travels less');
    assert.ok(results.brawl.distance>0,attack+' still has an impact');
  }
});
