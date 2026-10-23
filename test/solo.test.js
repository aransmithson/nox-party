import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';

test('one to four humans can start every mode with CPUs filling empty places',()=>{
  for(const mode of ['brawl','race','cars','breakout','pong','shelfball','potato'])for(let humans=1;humans<=4;humans++){
    const game=new Game();
    game.setMode(mode);
    const ids=Array.from({length:humans},(_,i)=>game.add(`Human ${i+1}`).id);
    assert.equal(game.startWithCpu(),true,`${mode} with ${humans} humans`);
    assert.equal(game.phase,'countdown');
    assert.equal(game.players.length,4);
    assert.equal(game.players.filter(p=>p.bot).length,4-humans);
    assert.deepEqual(game.players.filter(p=>!p.bot).map(p=>p.id),ids);
    assert.equal(new Set(game.players.map(p=>p.color)).size,4);
    assert.ok(game.players.every(p=>p.lives===3&&p.hp===100));
    if(mode==='cars')assert.ok(game.players.every(p=>p.car&&p.car.lap===0));
  }
});

test('a regular start requires a connected human without adding CPUs on failure',()=>{
  const game=new Game();
  assert.equal(game.startWithCpu(),false);
  assert.equal(game.players.length,0);
  const human=game.add('Offline');
  human.connected=false;
  game.add('Practice',true);
  assert.equal(game.startWithCpu(),false);
  assert.equal(game.players.length,2);
  assert.equal(game.phase,'lobby');
});

test('an invalid parkour arena does not fill the roster or begin a match',()=>{
  const game=new Game([{x1:150,x2:1130,y1:470,y2:470}]);
  game.setMode('race');
  game.add('Solo');
  assert.equal(game.startWithCpu(),false);
  assert.equal(game.players.length,1);
  assert.equal(game.phase,'lobby');
});

test('repeated start requests do not reset an active solo match',()=>{
  const game=new Game();
  game.add('Solo');
  game.startWithCpu();
  for(const phase of ['countdown','playing','finished']){
    game.phase=phase;
    game.time=1.25;
    game.players[0].hp=50;
    assert.equal(game.startWithCpu(),false);
    assert.equal(game.phase,phase);
    assert.equal(game.time,1.25);
    assert.equal(game.players[0].hp,50);
    assert.equal(game.players.length,4);
  }
});

test('late phones replace solo CPUs without removing the original human',()=>{
  const game=new Game();
  game.setMode('potato');
  const human=game.add('Solo');
  game.startWithCpu();
  game.phase='playing';
  const bot=game.players.find(p=>p.bot);
  const late=game.add('Late phone');
  assert.equal(late.color,bot.color);
  assert.equal(late.bombScore,bot.bombScore);
  assert.ok(game.players.includes(human));
  assert.equal(game.players.length,4);
  assert.equal(game.players.filter(p=>p.bot).length,2);
});

test('solo opponents produce movement in fighting and car modes',()=>{
  for(const mode of ['brawl','race','potato','cars']){
    const game=new Game();
    game.setMode(mode);
    game.add('Solo');
    game.startWithCpu();
    game.phase='playing';
    const bots=game.players.filter(p=>p.bot);
    const positions=bots.map(p=>mode==='cars'?{x:p.car.x,y:p.car.y}:{x:p.x,y:p.y});
    for(let i=0;i<30;i++)game.step(1/60);
    assert.ok(bots.some((p,i)=>{const pos=mode==='cars'?p.car:p;return Math.hypot(pos.x-positions[i].x,pos.y-positions[i].y)>5;}),`${mode} CPUs should move`);
  }
});
