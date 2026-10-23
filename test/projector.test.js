import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import projector from '../desktop/projector-window.cjs';
const {chooseDisplay,placeProjector}=projector;
const displays=[{id:1,bounds:{x:0,y:0,width:1707,height:1067}},{id:2,bounds:{x:-1280,y:0,width:1280,height:720}}];
test('automatic projector selection follows hotplug instead of retaining the main-screen fallback',()=>{
 assert.equal(chooseDisplay(displays.slice(0,1),1,'auto').id,1);
 assert.equal(chooseDisplay(displays,1,'auto').id,2);
 assert.equal(chooseDisplay(displays,2,'auto').id,1);
 assert.equal(chooseDisplay(displays,1,'1').id,1);
 assert.throws(()=>chooseDisplay(displays,1,999),/no longer connected/);
});
test('projector exits fullscreen before moving and enters fullscreen after positioning',async()=>{
 const win=new EventEmitter(),calls=[];let full=true;
 win.isFullScreen=()=>full;win.setFullScreen=v=>{calls.push(['fullscreen',v]);setImmediate(()=>{full=v;win.emit(v?'enter-full-screen':'leave-full-screen');});};
 win.setBounds=b=>{assert.equal(full,false);calls.push(['bounds',b]);};win.showInactive=()=>calls.push(['show']);
 await placeProjector(win,displays[1]);
 assert.deepEqual(calls,[['fullscreen',false],['bounds',displays[1].bounds],['show'],['bounds',displays[1].bounds],['fullscreen',true]]);
});
