import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';
function match(platforms){const g=new Game(platforms);g.add('A');g.add('B');g.start();g.phase='playing';for(const p of g.players)p.inv=0;return g;}
function pair(){const g=match(),[a,b]=g.players;a.x=450;b.x=490;a.y=b.y=470;a.face=1;b.face=-1;return {g,a,b};}
test('front-facing guard reduces damage and produces block sparks',()=>{const {g,a,b}=pair();b.input.block=true;g.step(1/60);g.hit(a,'punch');assert.equal(b.hp,98);assert.equal(g.events.at(-1).type,'block');assert.ok(b.vx>0&&b.vx<150);});
test('guard does not protect the back',()=>{const {g,a,b}=pair();b.face=1;b.blocking=true;g.hit(a,'kick');assert.equal(b.hp,77);assert.ok(b.stun>0);});
test('blocked fighters cannot attack while holding guard',()=>{const {g,a,b}=pair();a.input={block:true,kick:true,punch:true};g.step(1/60);assert.equal(a.attack,null);assert.equal(b.hp,100);});
test('hit reaction preserves knockback despite opposing movement input',()=>{const {g,a,b}=pair();g.hit(a,'kick');b.input.left=true;g.step(1/60);assert.ok(b.vx>200&&b.vx<250);assert.ok(b.x>490);});
test('jump plus kick hits once without propelling the attacker forward',()=>{const {g,a,b}=pair();a.input={jump:true,kick:true};g.step(1/60);assert.equal(a.attack.type,'fly');assert.equal(b.hp,70);assert.equal(a.vx,0);assert.ok(b.vx>300&&b.vx<350);for(let i=0;i<10;i++)g.step(1/60);assert.equal(a.x,450);assert.equal(b.hp,70);assert.ok(g.events.some(e=>e.type==='fly'));});
test('airborne kicks retain normal jump momentum, drag and steering',()=>{
  for(const vx of [-180,0,180])for(const input of [{},{left:true},{right:true}]){
    const normal=match(),kicking=match();
    for(const g of [normal,kicking])Object.assign(g.players[0],{x:250,y:380,peak:380,vx,vy:-300,ground:false,input:{...input}});
    kicking.hit(kicking.players[0],'kick');
    assert.equal(kicking.players[0].vx,vx);
    for(let i=0;i<20;i++){
      normal.step(1/60);kicking.step(1/60);
      for(const key of ['x','y','vx','vy'])assert.equal(kicking.players[0][key],normal.players[0][key],`${key} follows the normal jump trajectory`);
    }
  }
});
test('jump is edge-triggered, so holding the button does not auto-jump after landing',()=>{const g=match(),p=g.players[0];p.input.jump=true;g.step(1/60);assert.ok(p.vy<0);for(let i=0;i<90;i++)g.step(1/60);assert.equal(p.ground,true);assert.equal(p.vy,0);});
test('running and landing create dust',()=>{const g=match(),p=g.players[0];p.input.right=true;for(let i=0;i<10;i++)g.step(1/60);assert.ok(g.events.some(e=>e.type==='dust'));p.input={};p.y=465;p.vy=300;p.ground=false;g.step(1/30);assert.ok(p.land>0);});
test('solid wall stops horizontal movement',()=>{const g=match([{x1:100,y1:470,x2:1180,y2:470},{x1:500,y1:200,x2:560,y2:200,kind:'solid',bottom:470}]),p=g.players[0];p.x=480;p.y=470;p.input.right=true;for(let i=0;i<30;i++)g.step(1/60);assert.ok(p.x<=488);assert.equal(p.y,470);});
test('solid obstacles stop attacks through them',()=>{const {g,a,b}=pair();g.platforms.push({x1:465,y1:350,x2:480,y2:350,kind:'solid',bottom:470});g.hit(a,'kick');assert.equal(b.hp,100);});
test('reachable ledge can be grabbed then climbed with a fresh jump',()=>{const g=match([{x1:100,y1:470,x2:1180,y2:470},{x1:500,y1:350,x2:600,y2:350,kind:'solid',bottom:470}]),p=g.players[0];Object.assign(p,{x:487,y:408,vx:140,vy:30,ground:false,input:{right:true}});g.step(1/60);assert.ok(p.hang);assert.equal(p.y,408);p.input.jump=true;g.step(1/60);assert.ok(p.climb);p.input={};for(let i=0;i<30;i++)g.step(1/60);assert.equal(p.climb,null);assert.equal(p.y,350);assert.ok(p.ground);assert.ok(p.x>500);});
test('block drops from a ledge and prevents immediate re-grab',()=>{const g=match(),p=g.players[0];p.hang={index:1,side:-1};p.x=588;p.y=453;p.ground=false;p.input={block:true};g.step(1/60);assert.equal(p.hang,null);assert.ok(p.grabCooldown>0);assert.ok(p.vy>0);});
test('a long fall opens an umbrella and caps descent speed',()=>{const g=match(),p=g.players[0];Object.assign(p,{x:80,y:430,peak:200,vy:500,ground:false});g.step(1/60);assert.equal(p.umbrella,true);assert.equal(p.vy,115);});
test('umbrella closes on landing and never saves a knocked-out fighter',()=>{const g=match(),p=g.players[0];Object.assign(p,{x:400,y:469,peak:200,vy:300,ground:false});g.step(1/60);assert.equal(p.ground,true);assert.equal(p.umbrella,false);Object.assign(p,{hp:0,y:500,peak:200,vy:400,ground:false});g.step(1/60);assert.equal(p.umbrella,false);assert.ok(p.vy>400);});
test('normal jump does not open an umbrella',()=>{const g=match(),p=g.players[0];p.input.jump=true;for(let i=0;i<70;i++){g.step(1/60);assert.equal(p.umbrella,false);}});
test('losing balance causes a brief stumble and then recovers',()=>{const g=match(),p=g.players[0];p.balance=.75;g.step(1/60);assert.ok(p.stumble>0);assert.ok(p.stun>0);assert.ok(g.events.some(e=>e.type==='dust'));for(let i=0;i<90;i++)g.step(1/60);assert.equal(p.stumble,0);assert.ok(Math.abs(p.balance)<.3);});
test('a hit transfers angular momentum into the wobbly body',()=>{const {g,a,b}=pair();g.hit(a,'kick');assert.ok(b.balanceV>4);for(let i=0;i<10;i++)g.step(1/60);assert.ok(b.balance>.2);});
test('a phone player can join an open slot during a running match',()=>{const g=match();const p=g.add('Late arrival');assert.ok(p);assert.equal(g.phase,'playing');assert.equal(p.lives,3);assert.equal(p.hp,100);assert.ok(p.inv>0);});
test('phone players replace practice bots during a match',()=>{const g=new Game();for(let i=0;i<4;i++)g.add('Bot '+i,true);g.start();g.phase='playing';for(let i=0;i<4;i++){const p=g.add('Human '+i);assert.ok(p);assert.equal(p.bot,false);assert.equal(g.players.length,4);}assert.ok(g.players.every(p=>!p.bot));assert.equal(new Set(g.players.map(p=>p.color)).size,4);assert.equal(g.add('Fifth'),null);});
