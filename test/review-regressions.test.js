import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
import {makeBricks,DEFAULT_BREAKOUT} from '../public/arcade-layout.js';

function match(mode){const game=new Game();game.setMode(mode);game.add('Host');game.startWithCpu();game.phase='playing';return game;}

test('taking over a CPU preserves its current round, identity and owned objects',()=>{
  for(const mode of ['brawl','race','cars','breakout','pong','shelfball','potato']){
    const game=match(mode),bot=game.players.find(p=>p.bot),id=bot.id;
    bot.lives=1;bot.hp=45;bot.input={right:true};
    if(bot.car){bot.car.lap=2;bot.car.item='rocket';}
    if(bot.paddle)bot.paddle.score=70;
    if(mode==='potato'){bot.bombScore=-3;game.potato.holderId=id;}
    const before=structuredClone(bot),human=game.add('New phone');
    assert.equal(human.id,id,mode);assert.equal(human.bot,false);assert.equal(human.name,'New phone');assert.deepEqual(human.input,{});
    for(const key of ['x','y','lives','hp','color','car','paddle','team','bombScore'])assert.deepEqual(human[key],before[key],mode+': '+key);
    if(mode==='breakout')assert.ok(game.arcade.balls.some(b=>b.owner===human.id));
    if(mode==='potato')assert.equal(game.potato.holderId,human.id);
  }
});
test('joining an empty Brick Breakers slot during play supplies a ball',()=>{
  const game=new Game();game.setMode('breakout');game.add('A');game.add('B');game.start();game.phase='playing';
  const late=game.add('Late');assert.equal(game.arcade.balls.length,3);assert.ok(game.arcade.balls.some(b=>b.owner===late.id));
});
test('mode changes clear old paddles and initialize cars and team previews',()=>{
  const game=match('pong');game.lobby();game.players[0].paddle.team=1;
  game.setMode('shelfball');assert.equal(game.players[0].team,0);assert.equal(game.players[0].paddle,undefined);assert.ok(game.shelfball.ball);
  game.setMode('cars');assert.ok(game.players[0].car);game.players[0].car.lap=3;game.lobby();assert.equal(game.players[0].car.lap,0);
  game.setMode('brawl');assert.equal(game.players[0].car,undefined);assert.equal(game.players[0].team,undefined);
});
test('snapshots retain editable layouts but do not leak racing effects into other modes',()=>{
  const game=match('cars');game.cars.burst(100,100,'#fff',0);game.cars.items.push({id:9,type:'rocket'});
  game.lobby();game.setMode('brawl');const state=game.snapshot();
  assert.deepEqual(state.breakoutLayout,DEFAULT_BREAKOUT);assert.deepEqual(state.items||[],[]);assert.deepEqual(state.carEffects||[],[]);
});
test('fighters stay planted while walking up and down steep mapped slopes',()=>{
  for(const [y1,y2]of [[650,150],[150,650]]){
    const game=new Game([{x1:100,x2:400,y1,y2}]);const p=game.add('Tester');game.startTest();game.phase='playing';p.input.right=true;
    for(let i=0;i<30;i++){game.step(1/60);assert.equal(p.ground,true);assert.ok(Math.abs(p.y-(y1+(y2-y1)*(p.x-100)/300))<.001);}
  }
});
test('a newly served breakout ball clears the previous hitter credit',()=>{
  const game=match('breakout'),ball=game.arcade.balls[0];ball.lastHit=game.players[1].id;
  Object.assign(ball,{serve:0,y:800,vy:300});game.step(1/60);assert.ok(ball.serve>0);assert.equal(ball.lastHit,null);
});
test('minimum-height drawn rectangles keep all bricks inside the selected shape',()=>{
  const shape={kind:'rect',x:200,y:120,w:32,h:20};const bricks=makeBricks({ground:400,shapes:[shape]});assert.equal(bricks.length,1);
  assert.ok(bricks.every(b=>b.y+b.h<=shape.y+shape.h&&b.x+b.w<=shape.x+shape.w));
});
test('Shelfball serves above a tall object instead of inside it',()=>{
  const game=new Game([{x1:100,x2:1180,y1:550,y2:550},{x1:550,x2:730,y1:250,y2:250,kind:'solid',bottom:550}]);
  game.setMode('shelfball');game.add('Tester');game.startTest();const ball=game.shelfball.ball;assert.ok(ball.y+ball.r<=250);
});
test('test mode advertises unlimited lives in Brick Breakers too',()=>{
  const game=new Game();game.setMode('breakout');const p=game.add('Tester');game.startTest();assert.equal(p.unlimitedLives,true);
});
