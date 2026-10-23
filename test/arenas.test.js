import {DEFAULT_BREAKOUT} from '../public/arcade-layout.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ArenaStore,validatePlatforms} from '../arenas.js';
import {DEFAULT_PLATFORMS} from '../game.js';
import {DEFAULT_TRACK} from '../cars.js';
test('damaged library entries are rejected without overwriting the library',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nox-damaged-')),store=new ArenaStore(dir);
 const text=JSON.stringify({version:1,arenas:[{id:'bad',name:'Broken',platforms:[]}]});await writeFile(path.join(dir,'arenas.json'),text);
 await assert.rejects(store.list(),/damaged layout/);
 await assert.rejects(store.save({name:'New',platforms:DEFAULT_PLATFORMS}),/damaged layout/);
 assert.equal(await readFile(path.join(dir,'arenas.json'),'utf8'),text);
});
test('UTF-8 BOMs in track and block files do not silently load defaults',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nox-bom-')),store=new ArenaStore(dir);
 const track={...DEFAULT_TRACK,laps:7},blocks={...DEFAULT_BREAKOUT,ground:680};
 await writeFile(path.join(dir,'track.json'),'\uFEFF'+JSON.stringify(track));await writeFile(path.join(dir,'breakout.json'),'\uFEFF'+JSON.stringify(blocks));
 assert.deepEqual(await store.loadTrack(),track);assert.deepEqual(await store.loadBreakout(),blocks);
});
test('legacy Infection presets load their geometry as Brawl without changing the saved file',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'nox-legacy-')),store=new ArenaStore(dir);
 const old={version:1,arenas:[{id:'old',name:'My old arena',mode:'infection',platforms:DEFAULT_PLATFORMS}]};
 const text=JSON.stringify(old);await writeFile(path.join(dir,'arenas.json'),text);
 assert.equal((await store.list())[0].mode,'brawl');
 const loaded=await store.get('old');assert.equal(loaded.mode,'brawl');assert.deepEqual(loaded.platforms,DEFAULT_PLATFORMS);
 await assert.rejects(store.save({name:'Removed mode',mode:'infection',platforms:DEFAULT_PLATFORMS}),/Unknown game mode/);
 assert.equal(await readFile(path.join(dir,'arenas.json'),'utf8'),text);
});
test('named arenas preserve visible objects, tracks and modes across store restarts',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'wallio-arenas-')),store=new ArenaStore(dir);
 const platforms=structuredClone(DEFAULT_PLATFORMS);platforms[1].showOnProjector=true;
 const a=await store.save({name:'Candle castle',platforms});const b=await store.save({name:'Wall circuit',platforms,track:DEFAULT_TRACK,mode:'cars'});
 const reopened=new ArenaStore(dir);assert.equal((await reopened.list()).length,2);assert.deepEqual((await reopened.get(a.id)).platforms,platforms);assert.deepEqual((await reopened.get(b.id)).track,DEFAULT_TRACK);assert.equal((await reopened.get(b.id)).mode,'cars');
 platforms[1].x1=580;const updated=await reopened.save({id:a.id,name:'Castle v2',platforms});assert.equal(updated.id,a.id);assert.equal((await reopened.list()).length,2);
 await reopened.saveCurrent(platforms);assert.deepEqual(await new ArenaStore(dir).loadCurrent([]),platforms);
 await reopened.saveTrack(DEFAULT_TRACK);assert.deepEqual(await new ArenaStore(dir).loadTrack(),DEFAULT_TRACK);
});
test('duplicate names and malformed shapes do not overwrite existing saves',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'wallio-arenas-')),store=new ArenaStore(dir);await store.save({name:'Home',platforms:DEFAULT_PLATFORMS});await assert.rejects(store.save({name:' home ',platforms:DEFAULT_PLATFORMS}),/already saved/);await assert.rejects(store.save({name:'Bad',platforms:[]}),/surfaces/);assert.equal((await store.list()).length,1);assert.throws(()=>validatePlatforms([{x1:20,x2:300,y1:200,y2:200,kind:'solid',bottom:150}]),/geometry/);});
test('concurrent saves retain both entries and broken libraries are left untouched',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'wallio-arenas-')),store=new ArenaStore(dir);await Promise.all(['One','Two'].map(name=>store.save({name,platforms:DEFAULT_PLATFORMS})));assert.equal((await store.list()).length,2);await writeFile(path.join(dir,'arenas.json'),'broken');await assert.rejects(store.save({name:'Three',platforms:DEFAULT_PLATFORMS}));assert.equal(await readFile(path.join(dir,'arenas.json'),'utf8'),'broken');});

test('block shapes and ground level persist in current and named layouts',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'nox-blocks-')),store=new ArenaStore(dir),layout={...DEFAULT_BREAKOUT,ground:610};await store.saveBreakout(layout);const saved=await store.save({name:'Block stage',mode:'breakout',platforms:DEFAULT_PLATFORMS,breakout:layout});const reopened=new ArenaStore(dir);assert.deepEqual(await reopened.loadBreakout(),layout);assert.deepEqual((await reopened.get(saved.id)).breakout,layout);});
