import {DEFAULT_BREAKOUT,validateBreakout} from './public/arcade-layout.js';
import {validateTrack,DEFAULT_TRACK} from './cars.js';
import {readFile,writeFile,rename,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';

export function validatePlatforms(platforms){
  if(!Array.isArray(platforms)||platforms.length<1||platforms.length>12)throw new Error('An arena needs 1–12 surfaces.');
  if(!platforms.every(s=>s&&['x1','x2','y1','y2'].every(k=>Number.isFinite(s[k]))&&s.x1>=0&&s.x2<=1280&&s.x2-s.x1>=25&&s.y1>=100&&s.y2>=100&&s.y1<=680&&s.y2<=680&&(!s.kind||s.kind==='solid')&&(s.showOnProjector===undefined||typeof s.showOnProjector==='boolean')&&(s.kind!=='solid'||(Number.isFinite(s.bottom)&&s.y1===s.y2&&s.bottom>=s.y1+20&&s.bottom<=700))))throw new Error('Invalid arena geometry. Check widths, heights and bounds.');
  return platforms.map(s=>({x1:s.x1,x2:s.x2,y1:s.y1,y2:s.y2,...(s.showOnProjector?{showOnProjector:true}:{}),...(s.kind==='solid'?{kind:'solid',bottom:s.bottom}:{})}));
}

export class ArenaStore {
  constructor(directory){this.directory=directory;this.pending=Promise.resolve();}
  async readLibrary(){
    let text;try{text=await readFile(path.join(this.directory,'arenas.json'),'utf8');}catch(e){if(e.code==='ENOENT')return [];throw e;}
    const data=JSON.parse(text.replace(/^\uFEFF/,''));
    if(data.version!==1||!Array.isArray(data.arenas))throw new Error('The arena library is damaged. Your saved file has been left untouched.');
    try{
      const ids=new Set(),names=new Set();
      for(const arena of data.arenas){
        if(!arena||typeof arena.id!=='string'||!arena.id||typeof arena.name!=='string'||!arena.name.trim()||ids.has(arena.id)||names.has(arena.name.toLocaleLowerCase())||arena.mode&&!['brawl','race','cars','breakout','pong','shelfball','potato','infection'].includes(arena.mode))throw new Error('Invalid entry');
        validatePlatforms(arena.platforms);if(arena.track)validateTrack(arena.track);if(arena.breakout)validateBreakout(arena.breakout);
        ids.add(arena.id);names.add(arena.name.toLocaleLowerCase());
      }
    }catch{throw new Error('The arena library contains a damaged layout. Your saved file has been left untouched.');}
    return data.arenas;
  }
  async list(){return (await this.readLibrary()).map(({id,name,updatedAt,platforms,mode})=>({id,name,updatedAt,mode:mode==='infection'?'brawl':mode,surfaces:platforms.length})).sort((a,b)=>a.name.localeCompare(b.name));}
  async get(id){const arena=(await this.readLibrary()).find(a=>a.id===id);if(!arena)throw new Error('That saved arena no longer exists.');return {...arena,mode:arena.mode==='infection'?'brawl':arena.mode,platforms:validatePlatforms(arena.platforms),track:arena.track?validateTrack(arena.track):undefined,breakout:arena.breakout?validateBreakout(arena.breakout):undefined};}
  enqueue(operation){const result=this.pending.then(operation);this.pending=result.catch(()=>{});return result;}
  async atomicWrite(filename,data){
    await mkdir(this.directory,{recursive:true});const destination=path.join(this.directory,filename),temporary=destination+'.'+crypto.randomUUID()+'.tmp';
    try{await writeFile(temporary,JSON.stringify(data,null,2),'utf8');await rename(temporary,destination);}finally{await rm(temporary,{force:true});}
  }
  save({id,name,platforms,track,breakout,mode}){
    return this.enqueue(async()=>{
      if(typeof name!=='string')throw new Error('Enter a name for this arena.');
      name=name.trim().replace(/\s+/g,' ');if(!name||name.length>48||/[\x00-\x1f]/.test(name))throw new Error('Use an arena name between 1 and 48 characters.');
      if(mode&&!['brawl','race','cars','breakout','pong','shelfball','potato'].includes(mode))throw new Error('Unknown game mode.');const validatedBreakout=breakout?validateBreakout(breakout):undefined;const validatedTrack=track?validateTrack(track):undefined;const geometry=validatePlatforms(platforms),arenas=await this.readLibrary();
      const existing=id?arenas.find(a=>a.id===id):null;if(id&&!existing)throw new Error('That saved arena no longer exists.');
      if(arenas.some(a=>a.id!==id&&a.name.toLocaleLowerCase()===name.toLocaleLowerCase()))throw new Error('That name is already saved. Choose it and use Update selected, or enter a new name.');
      const arena={id:existing?.id||crypto.randomUUID(),name,platforms:geometry,...(validatedTrack?{track:validatedTrack}:{}),...(validatedBreakout?{breakout:validatedBreakout}:{}),...(mode?{mode}:{}),updatedAt:new Date().toISOString()};
      if(existing)arenas[arenas.indexOf(existing)]=arena;else arenas.push(arena);
      await this.atomicWrite('arenas.json',{version:1,arenas});return arena;
    });
  }
  async loadCurrent(fallback){try{return validatePlatforms(JSON.parse((await readFile(path.join(this.directory,'arena.json'),'utf8')).replace(/^\uFEFF/,'')));}catch(e){if(e.code!=='ENOENT')console.warn('Unable to read current arena; using default layout.');return structuredClone(fallback);}}
  async loadTrack(){try{return validateTrack(JSON.parse((await readFile(path.join(this.directory,'track.json'),'utf8')).replace(/^\uFEFF/,'')));}catch{return structuredClone(DEFAULT_TRACK);}}
  async loadBreakout(){try{return validateBreakout(JSON.parse((await readFile(path.join(this.directory,'breakout.json'),'utf8')).replace(/^\uFEFF/,'')));}catch{return structuredClone(DEFAULT_BREAKOUT);}}
  saveBreakout(layout){const valid=validateBreakout(layout);return this.enqueue(()=>this.atomicWrite('breakout.json',valid));}
  saveTrack(track){const valid=validateTrack(track);return this.enqueue(()=>this.atomicWrite('track.json',valid));}
  saveCurrent(platforms){const geometry=validatePlatforms(platforms);return this.enqueue(()=>this.atomicWrite('arena.json',geometry));}
}
