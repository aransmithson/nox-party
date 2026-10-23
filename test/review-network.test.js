import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocket} from 'ws';
import http from 'node:http';
import {startServer,receive} from '../test-support/server.js';

test('network handles editor locks, reconnects and malformed clients without losing the game',async t=>{
  const server=await startServer(t),{base,host,info,connect,request}=server;
  const phone=await connect();const joined=await request(phone,{type:'join',room:info.room,name:'Host phone'},m=>m.type==='joined');
  await t.test('open edits block both desktop and phone start commands',async()=>{
    await request(host,{type:'editing',enabled:true},m=>m.type==='state'&&m.setupBusy);
    for(const [ws,message]of [[host,{type:'start'}],[host,{type:'demo'}],[host,{type:'mode',mode:'cars'}],[phone,{type:'next-game',mode:'cars'}]]){
      const result=await request(ws,message,m=>m.type==='error');assert.match(result.message,/edit/i);
    }
    const state=await receive(host,m=>m.type==='state');assert.equal(state.phase,'lobby');assert.equal(state.mode,'brawl');assert.equal(state.players.length,1);
    await request(host,{type:'editing',enabled:false},m=>m.type==='state'&&!m.setupBusy);
  });
  await t.test('a controller takeover closes the old socket with a non-retry code',async()=>{
    const replacement=await connect(),closed=new Promise(resolve=>phone.once('close',code=>resolve(code)));
    const resumed=await request(replacement,{type:'join',room:info.room,session:joined.session},m=>m.type==='joined');
    assert.equal(resumed.id,joined.id);assert.equal(await closed,4001);
    const state=await receive(host,m=>m.type==='state');assert.equal(state.players.length,1);assert.equal(state.players[0].connected,true);
  });
  await t.test('foreign web origins and rebound hostnames cannot reach the game',async()=>{
    assert.equal((await fetch(base+'/api/info',{headers:{Origin:'https://example.org'}})).status,403);
    const status=await new Promise((resolve,reject)=>http.get(base,{headers:{Host:'other.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject));
    assert.equal(status,403);
    const foreign=new WebSocket(base.replace('http','ws'),{origin:'https://example.org'});
    const error=await new Promise(resolve=>foreign.once('error',resolve));assert.match(error.message,/403/);
  });
  await t.test('invalid JSON and oversized websocket frames cannot crash the server',async()=>{
    const bad=await connect();let response=receive(bad,m=>m.type==='error');bad.send('{broken');await response;
    response=receive(bad,m=>m.type==='error');bad.send('null');await response;
    const closed=new Promise(resolve=>bad.once('close',resolve));bad.send('x'.repeat(9000));await closed;
    const state=await receive(host,m=>m.type==='state');assert.equal(state.players.length,1);assert.equal(server.child.exitCode,null);
    assert.equal((await fetch(base+'/api/info')).status,200);assert.equal(server.errors(),'');
  });
});
