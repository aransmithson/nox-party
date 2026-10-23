const {app,BrowserWindow,ipcMain,screen,utilityProcess,dialog,powerSaveBlocker}=require('electron');
const path=require('node:path');
const net=require('node:net');
const {chooseDisplay,placeProjector}=require('./projector-window.cjs');
let desk,output,server,base,displayId,blank=false,calibration={enabled:false,platforms:[]},quitting=false;
let outputTarget=null,outputQueue=Promise.resolve(),outputError='';
const smoke=process.argv.includes('--smoke-test');
const smokeData=smoke?require('node:fs').mkdtempSync(path.join(require('node:os').tmpdir(),'wallio-desktop-')):null;
if(smoke)app.setPath('userData',smokeData);
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
if(!app.requestSingleInstanceLock()){app.quit();}else{
app.on('second-instance',()=>{if(desk){desk.restore();desk.focus();}});
app.whenReady().then(async()=>{try{
const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.on('error',e=>{if(e.code==='EADDRINUSE')s.listen(0,'127.0.0.1');else reject(e);});s.listen(smoke?0:3000,'0.0.0.0',()=>{const p=s.address().port;s.close(()=>resolve(p));});});
base=`http://127.0.0.1:${port}`;
server=utilityProcess.fork(path.join(__dirname,'..','server.js'),[],{env:{...process.env,PORT:String(port),...(smoke?{ARENA_DATA_DIR:smokeData}:{})},stdio:'pipe'});
if(smoke)server.stderr.on('data',chunk=>process.stderr.write(chunk));
await new Promise((resolve,reject)=>{let log='';const timeout=setTimeout(()=>reject(new Error('Game server did not start.')),15000);server.stdout.on('data',chunk=>{log+=chunk;if(log.includes('Nox Party:')){clearTimeout(timeout);resolve();}});server.once('exit',code=>{clearTimeout(timeout);reject(new Error(`Game server exited (${code}).`));});});
server.on('exit',()=>{if(!quitting){dialog.showErrorBox('Game server stopped','Close and reopen Nox Party to restart the game.');app.quit();}});
powerSaveBlocker.start('prevent-display-sleep');
desk=new BrowserWindow({title:'Nox Party — Control desk',width:1450,height:950,minWidth:900,minHeight:650,backgroundColor:'#101316',show:!smoke,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
desk.setMenu(null);secure(desk);desk.on('closed',()=>{desk=null;app.quit();});
ipcMain.handle('desktop:displays',e=>{authorize(e);return displays();});
ipcMain.handle('desktop:open',async(e,id)=>{authorize(e);return openProjector(id);});
ipcMain.handle('desktop:close',e=>{authorize(e);output?.close();return status();});
ipcMain.handle('desktop:blank',(e,value)=>{authorize(e);blank=!!value;publish();return status();});
ipcMain.on('desktop:calibration',(e,value)=>{authorize(e);if(typeof value?.enabled==='boolean'&&Array.isArray(value.platforms)&&value.platforms.length<=12){calibration=value;publish();}});
ipcMain.handle('desktop:state',e=>{authorize(e,true);return {blank,calibration,...status()};});
for(const event of ['display-added','display-removed','display-metrics-changed'])screen.on(event,()=>{
 const all=screen.getAllDisplays();
 if(output){
  if(!all.some(d=>d.id===displayId))output.close();
  else if(event==='display-metrics-changed'||outputTarget===null&&chooseDisplay(all,deskDisplayId()).id!==displayId)openProjector(outputTarget).catch(error=>{outputError=error.message;publish();});
 }
 desk?.webContents.send('desktop:displays-changed');
});
await desk.loadURL(base);
if(smoke){if(process.argv.includes('--sprites-only')){await require('./sprite-smoke.cjs')({desk});console.log('Car and umbrella sprite checks passed');app.quit();}else if(process.argv.includes('--projector-only')){await require('./projector-smoke.cjs')({desk,openProjector,getOutput:()=>output});console.log('Projector display checks passed');app.quit();}else if(process.argv.includes('--brick-editor-only')){await openProjector(screen.getPrimaryDisplay().id);await require('./breakout-smoke.cjs')({desk,output,dataDir:smokeData});console.log('Brick editor checks passed');app.quit();}else await smokeTest();}
}catch(error){if(smoke){console.error(error);quitting=true;server?.kill();app.exit(1);}else{dialog.showErrorBox('Unable to start Nox Party',error.message);app.quit();}}});
}
function authorize(e,allowOutput=false){if(e.sender!==desk?.webContents&&!(allowOutput&&e.sender===output?.webContents))throw new Error('Unavailable from this window');}
function secure(win){win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==base)e.preventDefault();});}
function deskDisplayId(){return desk?screen.getDisplayMatching(desk.getBounds()).id:screen.getPrimaryDisplay().id;}
function displays(){const all=screen.getAllDisplays(),recommended=chooseDisplay(all,deskDisplayId()).id;return all.map(d=>({id:d.id,label:d.label||`Display ${d.id}`,width:d.size.width,height:d.size.height,primary:d.id===screen.getPrimaryDisplay().id,recommended:d.id===recommended,controlDesk:d.id===deskDisplayId()}));}
function status(){return {open:!!output,displayId,displayLabel:screen.getAllDisplays().find(d=>d.id===displayId)?.label||'',blank,error:outputError,bounds:output?.getBounds(),fullscreen:output?.isFullScreen()||false};}
function publish(){output?.webContents.send('desktop:output-state',{blank,calibration});desk?.webContents.send('desktop:status',status());}
function openProjector(id){const task=outputQueue.then(()=>openProjectorNow(id));outputQueue=task.catch(()=>{});return task;}
async function openProjectorNow(id){
 const display=chooseDisplay(screen.getAllDisplays(),deskDisplayId(),id);outputTarget=id===undefined||id===null||id===''||id==='auto'?null:Number(id);outputError='';
 try{
 if(!output){
  const win=new BrowserWindow({...display.bounds,title:'Nox Party — Projector',frame:false,fullscreen:false,backgroundColor:'#000000',show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
  output=win;win.setMenu(null);secure(win);win.on('closed',()=>{if(output===win)output=null;publish();});
  win.webContents.on('before-input-event',(e,input)=>{if(input.type!=='keyDown')return;if(input.key==='Escape'){e.preventDefault();win.close();desk?.focus();}if(input.key.toLowerCase()==='b'){e.preventDefault();blank=!blank;publish();}});
  await win.loadURL(base+'/projector');
 }
  await placeProjector(output,display,!smoke||process.argv.includes('--projector-only'));
  if(screen.getDisplayMatching(output.getBounds()).id!==display.id)throw new Error('Windows placed the projector on a different screen. Check the selected display and Windows Extend mode.');
  displayId=display.id;publish();return status();
 }catch(error){outputError=error.message;output?.destroy();throw error;}
}
app.on('before-quit',()=>{quitting=true;server?.kill();});
app.on('window-all-closed',()=>app.quit());
async function smokeTest(){
const fs=require('node:fs/promises');const assert=require('node:assert/strict');
await openProjector(screen.getPrimaryDisplay().id);
assert.equal(output.isFullScreen(),true);assert.equal(output.isMenuBarVisible(),false);
const canvas=await output.webContents.executeJavaScript(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{const c=document.querySelector('canvas');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let nonBlack=0;for(let i=0;i<d.length;i+=4)if(d[i]||d[i+1]||d[i+2])nonBlack++;resolve({nonBlack,canvases:document.querySelectorAll('canvas').length,children:document.body.children.length});})))`);
assert.equal(canvas.nonBlack,0,'Empty projector must be pure black');assert.equal(canvas.canvases,1);
await desk.webContents.executeJavaScript(`new Promise((resolve,reject)=>{let tries=0;function check(){if(document.getElementById('room').textContent.match(/[0-9]{4}/)){document.getElementById('calibrate').click();document.getElementById('addSolid').click();const field=document.getElementById('edit-x1');field.value='420';field.dispatchEvent(new Event('change'));resolve();}else if(++tries>240)reject(new Error('Desk did not initialize'));else requestAnimationFrame(check);}check();})`);
await desk.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
assert.equal(calibration.enabled,true,'Desk editor must enable projector guides');assert.equal(calibration.platforms.at(-1).x1,420,'Desk geometry must reach projector');
await output.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
let visible=await output.webContents.executeJavaScript(`(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4!==3&&v>0);})()`);assert.equal(visible,true,'Calibration must render guides');
blank=true;publish();await output.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
visible=await output.webContents.executeJavaScript(`(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4!==3&&v>0);})()`);assert.equal(visible,false,'Blackout must hide everything');
blank=false;publish();await desk.webContents.executeJavaScript(`document.getElementById('cancel').click()`);
await desk.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');assert.equal(calibration.enabled,false);
await desk.webContents.executeJavaScript(`document.getElementById('demo').click()`);
await new Promise(r=>setTimeout(r,3500));
const errors=[];output.webContents.on('console-message',(event)=>{if(event.level==='error')errors.push(event.message);});
await output.webContents.executeJavaScript('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
const activePixels=await output.webContents.executeJavaScript(`(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return d.some((v,i)=>i%4!==3&&v>0);})()`);assert.ok(activePixels,'Characters must render in a running match');
await fs.writeFile(path.join(__dirname,'..','shelf-life-preview.png'),(await desk.webContents.capturePage()).toPNG());
await fs.writeFile(path.join(__dirname,'..','projector-preview.png'),(await output.webContents.capturePage()).toPNG());
assert.equal(errors.length,0);
await require('./sprite-smoke.cjs')({desk});
const editorChecks=await require('./editor-smoke.cjs')({desk});
const extras=await require('./extended-smoke.cjs')({desk,output,base,dataDir:smokeData});
await fs.writeFile(path.join(__dirname,'..','desktop-smoke.json'),JSON.stringify({passed:true,...editorChecks,...extras,fullscreen:output.isFullScreen(),emptyOutputBlack:true,calibrationVisible:true,blackoutBlack:true,mainScreenEditingMirrored:true,charactersRendered:true,displays:displays()},null,2));
console.log('Desktop smoke checks passed');app.quit();
}
