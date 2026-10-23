const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
module.exports=async({desk})=>{
 const run=s=>desk.webContents.executeJavaScript(s),click=id=>run(`document.getElementById('${id}').click()`);
 const wait=async expression=>{for(let i=0;i<80;i++){if(await run(expression))return;await new Promise(r=>setTimeout(r,50));}throw new Error('Editor check timed out: '+expression);};
 await click('lobby');await wait(`!document.getElementById('calibrate').disabled`);
 const initial=await run(`document.querySelectorAll('.object-row').length`);
 await click('calibrate');await click('addSolid');
 assert.equal(await run(`document.querySelectorAll('.object-row').length`),initial+1);
 await click('undo');assert.equal(await run(`document.querySelectorAll('.object-row').length`),initial);
 await click('redo');assert.equal(await run(`document.querySelectorAll('.object-row').length`),initial+1);
 await click('duplicate');assert.equal(await run(`document.querySelectorAll('.object-row').length`),initial+2);
 await run(`document.querySelector('.object-row.selected .visibility-toggle').click()`);
 assert.equal(await run(`document.getElementById('showOnProjector').checked`),true);
 await click('undo');assert.equal(await run(`document.getElementById('showOnProjector').checked`),false);
 const x=await run(`Number(document.getElementById('edit-x1').value)`);
 await run(`document.getElementById('arena').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))`);
 assert.equal(await run(`Number(document.getElementById('edit-x1').value)`),x+1);
 await click('undo');assert.equal(await run(`Number(document.getElementById('edit-x1').value)`),x);
 const before=await run(`document.getElementById('stage').style.transform`);
 await click('zoomIn');assert.notEqual(await run(`document.getElementById('stage').style.transform`),before);
 assert.equal(await run(`document.getElementById('zoomValue').value`),'125%');
 await click('fitCanvas');assert.equal(await run(`document.getElementById('zoomValue').value`),'100%');
 await click('snapToggle');assert.equal(await run(`document.getElementById('snapToggle').getAttribute('aria-pressed')`),'true');
 await run(`(()=>{const c=document.getElementById('arena'),r=c.getBoundingClientRect();for(const [type,x,y]of [['pointerdown',481,370],['pointermove',514,390],['pointerup',514,390]])c.dispatchEvent(new PointerEvent(type,{pointerId:5,pointerType:'mouse',clientX:r.x+x/1280*r.width,clientY:r.y+y/720*r.height,button:0,buttons:type==='pointerup'?0:1,bubbles:true}));})()`);
 await click('snapToggle');
 // Losing focus mid-drag must finish a single undoable edit, not leave a stuck drag.
 const originalX=await run(`Number(document.getElementById('edit-x1').value)`);
 await run(`(()=>{const c=document.getElementById('arena'),r=c.getBoundingClientRect(),x=Number(document.getElementById('edit-x1').value),y=Number(document.getElementById('edit-y1').value);for(const [type,dx]of [['pointerdown',0],['pointermove',30]])c.dispatchEvent(new PointerEvent(type,{pointerId:9,clientX:r.x+(x+dx)/1280*r.width,clientY:r.y+y/720*r.height,button:0,buttons:1,bubbles:true}));window.dispatchEvent(new Event('blur'));c.dispatchEvent(new PointerEvent('pointermove',{pointerId:9,clientX:r.x+(x+80)/1280*r.width,clientY:r.y+y/720*r.height,button:0,buttons:0,bubbles:true}));})()`);
 assert.equal(await run(`Number(document.getElementById('edit-x1').value)`),originalX+30);
 await click('undo');assert.equal(await run(`Number(document.getElementById('edit-x1').value)`),originalX);
 await click('cancel');
 assert.equal(await run(`document.querySelectorAll('.object-row').length`),initial);
 await click('joinPlayers');assert.equal(await run(`document.getElementById('joinDialog').open`),true);await click('closeJoin');
 for(const [width,height]of [[1450,950],[1100,720],[900,650]]){
  desk.setContentSize(width,height);await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
  const bounds=await run(`(()=>{const ids=['canvasViewport','start','calibrate','fullscreen'];return ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight};});})()`);
  for(const r of bounds)assert.ok(r.x>=0&&r.y>=0&&r.right<=r.w+1&&r.bottom<=r.h+1,`${r.id} outside ${width}x${height}: ${JSON.stringify(r)}`);
  assert.ok(await run(`document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth`),'Desktop should not scroll as a webpage');
 }
 desk.setContentSize(1450,950);await click('calibrate');await click('addSolid');
 await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 await fs.writeFile(path.join(__dirname,'..','nox-party-editor-preview.png'),(await desk.webContents.capturePage()).toPNG());
 await click('cancel');await fs.writeFile(path.join(__dirname,'..','nox-party-desk-preview.png'),(await desk.webContents.capturePage()).toPNG());
 return {desktopWorkspace:true,editorUndoRedo:true,editorFocusLoss:true,objectVisibility:true,canvasNavigation:true,desktopFitsSmallWindows:true};
};
