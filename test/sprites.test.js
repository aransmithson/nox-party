import test from 'node:test';
import assert from 'node:assert/strict';
import {brawlerFrame,spriteIdentity,carFrame,umbrellaFrame} from '../public/sprites.js';
import {extraSpriteFrames} from '../public/extra-sprite-data.js';
import {spriteFrames} from '../public/sprite-data.js';
const player={hp:100,ground:true,vx:0,vy:0,stun:0,stumble:0};
test('cars and umbrella animation preserve each player identity',()=>{
 const colors=['#a8ff60','#9a94ff','#ff9675','#69deff'];assert.deepEqual(colors.map(carFrame),[0,1,2,3]);assert.equal(extraSpriteFrames.car.length,4);assert.equal(extraSpriteFrames.umbrella.length,8);
 colors.forEach((color,i)=>{const p={...player,color,umbrella:true};assert.equal(umbrellaFrame(p,0),i);assert.equal(umbrellaFrame(p,.5),i+4);assert.equal(umbrellaFrame({...p,umbrella:false},0),null);assert.equal(umbrellaFrame({...p,hp:0},0),null);});
});
test('four player colours select distinct sprite identities with complete pose sets',()=>{assert.equal(new Set(['#a8ff60','#9a94ff','#ff9675','#69deff'].map(spriteIdentity)).size,4);for(const frames of Object.values(spriteFrames))assert.equal(frames.length,16);});
test('sprite states follow combat, guard and traversal instead of movement',()=>{
 assert.equal(brawlerFrame({...player,blocking:true,vx:100},1,1),12);
 assert.equal(brawlerFrame({...player,hang:true},1,1),14);
 assert.equal(brawlerFrame({...player,climb:true},1,1),15);
 assert.equal(brawlerFrame({...player,stun:.2,blocking:true},1,1),13);
 assert.equal(brawlerFrame({...player,hp:0},1,1),13);
 assert.equal(brawlerFrame({...player,ground:false,vy:-200},1,1),6);
 assert.equal(brawlerFrame({...player,ground:false,vy:200},1,1),7);
});
test('punches and kicks have anticipation then contact frames, flying kicks use the kick pose',()=>{
 for(const [type,windup,contact]of [['punch',8,9],['kick',10,11],['fly',10,11]]){
  const p={...player,ground:false,attack:{type,start:10,until:11}};
  assert.equal(brawlerFrame(p,10.1,10.1),windup);
  assert.equal(brawlerFrame(p,10.5,10.5),contact);
 }
});
test('walking uses four phases tied to distance travelled',()=>{
 assert.deepEqual([0,1,2,3].map(i=>brawlerFrame({...player,vx:100,stride:i*Math.PI/2},3,3)),[2,3,4,5]);
 assert.equal(brawlerFrame({...player,vx:100,stride:2*Math.PI},3,3),2);
});
