const {screen}=require('electron');
const assert=require('node:assert/strict');
const {placeProjector,chooseDisplay}=require('./projector-window.cjs');
module.exports=async({desk,openProjector,getOutput})=>{
 const all=screen.getAllDisplays(),deskId=screen.getDisplayMatching(desk.getBounds()).id,automatic=chooseDisplay(all,deskId);
 await openProjector('auto');const win=getOutput();
 assert.equal(win.isFullScreen(),true);assert.equal(screen.getDisplayMatching(win.getBounds()).id,automatic.id);
 // Exercise native show/placement on the external output without covering the desk.
 if(automatic.id!==deskId){await placeProjector(win,automatic,true);assert.equal(screen.getDisplayMatching(win.getBounds()).id,automatic.id);win.hide();}
 for(const d of all){await openProjector(d.id);assert.equal(getOutput(),win);assert.equal(screen.getDisplayMatching(win.getBounds()).id,d.id);assert.equal(win.isFullScreen(),true);}
 const run=s=>desk.webContents.executeJavaScript(s);
 await run(`new Promise(resolve=>{const t=setInterval(()=>{if(document.getElementById('projectorDisplay').options.length>1){clearInterval(t);resolve();}},50)})`);
 assert.equal(await run(`document.getElementById('projectorDisplay').value`),'auto');
 await run(`document.getElementById('projectorDisplay').value=${JSON.stringify(String(automatic.id))};document.getElementById('projectorDisplay').dispatchEvent(new Event('change'));`);
 for(let i=0;i<60;i++){if(screen.getDisplayMatching(win.getBounds()).id===automatic.id&&win.isFullScreen())break;await new Promise(r=>setTimeout(r,50));}
 assert.equal(screen.getDisplayMatching(win.getBounds()).id,automatic.id);
 await assert.rejects(openProjector(-987654),/no longer connected/);
 console.log(JSON.stringify({selected:automatic.label,actualBounds:win.getBounds(),displays:all.map(d=>({id:d.id,label:d.label,bounds:d.bounds,scale:d.scaleFactor}))}));
 win.destroy();
 // A failed page load must not leave a dead output window that prevents reopening.
 const session=desk.webContents.session;
 session.webRequest.onBeforeRequest({urls:[new URL('/projector',desk.webContents.getURL()).href]},(_details,callback)=>callback({cancel:true}));
 try{await assert.rejects(openProjector('auto'));assert.equal(getOutput(),null);}
 finally{session.webRequest.onBeforeRequest(null);}
 await openProjector('auto');assert.ok(getOutput());assert.equal(getOutput().isFullScreen(),true);
};
