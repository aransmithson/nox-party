import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../game.js';

test('extended CPU and mixed-input runs keep all seven simulations finite',()=>{
  for(const mode of ['brawl','race','cars','breakout','pong','shelfball','potato']){
    const g=new Game();g.setMode(mode);const p=g.add('Tester');g.startWithCpu();g.phase='playing';
    for(let frame=0;frame<7200&&g.phase==='playing';frame++){
      if(frame%30===0)p.input={left:frame%120<60,right:frame%120>=60,jump:frame%90===0,kick:frame%60===0,punch:true,gas:true,brake:frame%180===0,fire:true,sprint:true,up:frame%120<60,down:frame%120>=60,paddle:(frame%300)/300};
      g.step(1/60);
      for(const q of g.players){
        for(const key of ['x','y','vx','vy','hp','lives'])assert.ok(Number.isFinite(q[key]),mode+': '+key);
        assert.ok(q.lives>=0&&q.lives<=3,mode);
        for(const [key,value]of Object.entries(q.car||q.paddle||{}))if(typeof value==='number')assert.ok(Number.isFinite(value),mode+': '+key);
      }
      for(const b of [...g.arcade.balls,...(g.shelfball.ball?[g.shelfball.ball]:[])])for(const key of ['x','y','vx','vy'])assert.ok(Number.isFinite(b[key]),mode+': ball '+key);
    }
  }
});
