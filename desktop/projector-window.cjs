function chooseDisplay(displays,deskDisplayId,requestedId){
 if(requestedId!==undefined&&requestedId!==null&&requestedId!==''&&requestedId!=='auto'){
  const display=displays.find(d=>d.id===Number(requestedId));
  if(!display)throw new Error('That display is no longer connected. Choose a connected projector display.');
  return display;
 }
 const display=displays.find(d=>d.id!==deskDisplayId)||displays[0];
 if(!display)throw new Error('No connected display was found.');
 return display;
}

function fullscreen(win,value){
 if(win.isFullScreen()===value)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const event=value?'enter-full-screen':'leave-full-screen';
  const finish=error=>{clearTimeout(timeout);win.removeListener(event,changed);win.removeListener('closed',closed);error?reject(error):resolve();};
  const changed=()=>finish(),closed=()=>finish(new Error('Projector window was closed.'));
  const timeout=setTimeout(()=>finish(new Error('The projector window could not change fullscreen mode.')),3000);
  win.once(event,changed);win.once('closed',closed);
  try{win.setFullScreen(value);}catch(error){finish(error);}
 });
}

async function placeProjector(win,display,show=true){
 // Place a normal window first. Entering fullscreen during creation can anchor it
 // to the primary monitor; moving a fullscreen window can also be ignored.
 await fullscreen(win,false);
 // Windows can emit fullscreen events before its DPI/geometry messages settle.
 await new Promise(resolve=>setTimeout(resolve,40));
 win.setBounds(display.bounds);
 if(show){win.showInactive();win.setBounds(display.bounds);}
 await new Promise(resolve=>setTimeout(resolve,40));
 await fullscreen(win,true);
 await new Promise(resolve=>setTimeout(resolve,40));
}

module.exports={chooseDisplay,placeProjector};
