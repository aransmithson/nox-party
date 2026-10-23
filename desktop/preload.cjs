const {contextBridge,ipcRenderer}=require('electron');
const on=(channel,fn)=>{const listener=(_event,value)=>fn(value);ipcRenderer.on(channel,listener);return ()=>ipcRenderer.removeListener(channel,listener);};
contextBridge.exposeInMainWorld('mantelDesktop',{
 displays:()=>ipcRenderer.invoke('desktop:displays'),
 open:id=>ipcRenderer.invoke('desktop:open',id),
 close:()=>ipcRenderer.invoke('desktop:close'),
 blank:value=>ipcRenderer.invoke('desktop:blank',value),
 calibration:value=>ipcRenderer.send('desktop:calibration',value),
 state:()=>ipcRenderer.invoke('desktop:state'),
 onOutput:fn=>on('desktop:output-state',fn),
 onStatus:fn=>on('desktop:status',fn),
 onDisplays:fn=>on('desktop:displays-changed',fn)
});
