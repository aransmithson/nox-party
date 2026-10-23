import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocket} from 'ws';

export function receive(ws,predicate,timeout=5000){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off('message',message);reject(new Error('Timed out waiting for game state'));},timeout);
    function message(raw){const value=JSON.parse(raw);if(predicate(value)){clearTimeout(timer);ws.off('message',message);resolve(value);}}
    ws.on('message',message);
  });
}
export async function startServer(t){
  const directory=await mkdtemp(path.join(tmpdir(),'nox-network-')),sockets=[];
  const root=fileURLToPath(new URL('../',import.meta.url));
  const child=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:'0',ARENA_DATA_DIR:directory},stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',data=>errors+=data);
  t.after(async()=>{
    for(const ws of sockets)ws.terminate();
    if(child.exitCode===null){const done=new Promise(resolve=>child.once('exit',resolve));child.kill();await done;}
    if(path.dirname(directory)!==path.resolve(tmpdir())||!path.basename(directory).startsWith('nox-network-'))throw new Error('Unexpected test directory');
    await rm(directory,{recursive:true,force:true});
  });
  const base=await new Promise((resolve,reject)=>{
    let log='';const timer=setTimeout(()=>reject(new Error('Server startup timed out: '+errors)),5000);
    child.stdout.on('data',data=>{log+=data;const found=log.match(/Nox Party: (http:\/\/localhost:\d+)/);if(found){clearTimeout(timer);resolve(found[1]);}});
    child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited: '+code+' '+errors));});
  });
  async function connect(options={}){
    const ws=new WebSocket(base.replace('http','ws'),options);sockets.push(ws);
    await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
    return ws;
  }
  const request=(ws,message,predicate)=>{const result=receive(ws,predicate);ws.send(JSON.stringify(message));return result;};
  const info=await fetch(base+'/api/info').then(r=>r.json());
  const html=await fetch(base).then(r=>r.text()),token=html.match(/HOST_TOKEN='([^']+)'/)[1];
  const host=await connect();host.send(JSON.stringify({type:'host',token}));
  return {base,directory,child,info,host,connect,request,errors:()=>errors};
}
