const $=id=>document.getElementById(id);
let ws,id,joined=false,retry,session=localStorage.getItem('mantel-session'),intent=null,currentMode=null,currentPhase=null,paddlePosition=.5,paddlePointer=null,currentTest=false;
const inputs={},pointers=new Map();
$('code').value=new URLSearchParams(location.search).get('room')||localStorage.getItem('mantel-room')||'';
$('name').value=localStorage.getItem('mantel-name')||'';
if(session&&$('code').value&&$('name').value)intent={name:$('name').value,room:$('code').value};
function capture(element,pointerId){try{element.setPointerCapture(pointerId);}catch{}}
function send(data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
function clear(){paddlePointer=null;for(const key of Object.keys(inputs))inputs[key]=false;pointers.clear();document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('active'));send({type:'input',...inputs});}
function showState(m){
  if(!id)return;
  const p=m.players.find(p=>p.id===id);
  if(!p&&joined){joined=false;session=null;localStorage.removeItem('mantel-session');$('pad').hidden=true;$('joinScreen').hidden=false;$('joinError').textContent='The server restarted. Join the new room shown on the PC.';intent=null;return;}
  if(!p)return;
  const changed=currentMode!==m.mode||currentPhase!==m.phase;
  if(changed){clear();currentMode=m.mode;currentPhase=m.phase;$('phoneNotice').hidden=true;$('phoneNextMode').value=m.mode;}
  currentTest=!!m.testMode;
  const finished=m.phase==='finished',host=m.hostPlayerId===id,cars=m.mode==='cars',potato=m.mode==='potato',maze=potato,paddles=['breakout','pong'].includes(m.mode),teamMode=['pong','shelfball'].includes(m.mode);
  $('phoneStatus').textContent=host?'Connected · HOST':'Connected';
  $('fightControls').hidden=finished||cars||maze||paddles;$('paddleControls').hidden=finished||!paddles;$('carControls').hidden=finished||!cars;$('mazeControls').hidden=finished||!maze;
  $('padHint').hidden=finished;
  document.body.classList.toggle('bomb-holder',potato&&m.phase==='playing'&&m.bomb?.holderId===id);$('padHint').textContent=potato?'Tag another player to pass the bomb · Pop = −1 point, then rejoin · Hold run to escape':paddles?(m.mode==='pong'?'Swipe up and down to move your bat · Two bats per team':'Swipe left and right to move your paddle · Keep the balls bouncing'):m.mode==='shelfball'?'Jump, shove and kick the ball · Score in the opposite goal':cars?'Hold throttle or reverse · Steer + handbrake to drift · Collect boxes, then use your item':m.mode==='brawl'?'Tap Jump again in the air to double jump · Jump + kick = flying kick · Block to guard':'Jump + kick = flying kick · Block to guard · Jump at a ledge to climb';
  $('phoneLives').textContent=potato?`${p.bombScore||0} POINTS`:teamMode?((m.mode==='pong'?p.paddle?.team:p.team)===0?'TEAM LIME':'TEAM VIOLET'):m.testMode?'SOLO TEST':cars?`LAP ${Math.min((p.car?.lap||0)+1,m.track.laps)}/${m.track.laps}`:p.unlimitedLives?'∞':p.lives?'● '.repeat(p.lives):'OUT';
  $('phoneHp').textContent=potato?`ROUND ${m.bomb?.remaining??90}s`:teamMode?`${m.teamScores?.[0]||0} : ${m.teamScores?.[1]||0}`:m.mode==='breakout'?`${p.paddle?.score||0} PTS`:cars?`${Math.round(Math.hypot(p.car?.vx||0,p.car?.vy||0)/3)} km/h`:maze?`RUN ${Math.round((p.stamina??3)/3*100)}%`:`${p.hp} HP`;
  $('itemLabel').textContent=p.car?.item?p.car.item.toUpperCase():'NO ITEM';
  $('phonePhase').textContent=finished?'Waiting for host':m.phase==='lobby'?'Waiting for host':m.phase==='countdown'?'Get ready':m.testMode?'Solo test · no opponents':potato?`${m.bomb?.holderId===id?'PASS THE BOMB!':'Stay away from the bomb'} · ${Math.max(0,m.bomb?.fuse||0).toFixed(1)}s`:teamMode?`First to ${m.scoreTarget}`:m.mode==='breakout'?'Keep the balls in play':p.lives===0?'Spectating':cars?(p.car?.item?'Item ready':'Collect an item box'):p.respawn>0?'Respawning…':p.hang?'Jump to climb · Block to drop':p.umbrella?'Floating':'Fight!';
  $('roundResult').hidden=!finished;
  if(finished){$('resultWinner').textContent=`Winner: ${m.winner||'Nobody'}`;$('resultDetail').textContent=potato?`Your score: ${p.bombScore||0}`:m.winner===p.name?'You won!':'Round complete';}
  if(paddles){const vertical=m.mode==='pong';$('swipeDirection').textContent=vertical?'↕':'↔';$('swipeLabel').textContent=vertical?'SWIPE UP / DOWN':'SWIPE LEFT / RIGHT';$('swipePad').classList.toggle('vertical',vertical);paddlePosition=vertical?((p.paddle?.y||380)-100)/570:((p.paddle?.x||640)-60)/1160;$('swipePad').setAttribute('aria-valuenow',String(Math.round(paddlePosition*100)));$('swipeMarker').style.setProperty('--position',`${paddlePosition*100}%`);}
  $('fightControls').querySelector('[data-key="punch"] small').textContent=m.mode==='shelfball'?'SHOVE':'PUNCH';
  $('fightControls').querySelector('[data-key="jump"] small').textContent=m.mode==='brawl'?'JUMP / DOUBLE':'JUMP / CLIMB';
  $('phoneTest').hidden=m.phase!=='lobby';$('phoneTest').disabled=!!m.setupBusy||m.players.filter(q=>!q.bot&&q.connected).length!==1;
  $('phoneHost').hidden=!host||!['lobby','finished'].includes(m.phase)&&!m.testMode;
  $('phoneNextGame').disabled=!!m.setupBusy;$('phoneNextGame').title=m.setupBusy?'Finish editing on the desktop first':'';
  $('phoneNextMode').hidden=!!m.testMode;
  $('phoneNextGame').textContent=m.testMode?'End test':finished?'Start next game':'Start game';
}
function connect(){
  clearTimeout(retry);ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}`);
  ws.onopen=()=>{if(intent)send({type:'join',...intent,session});};
  ws.onmessage=e=>{const m=JSON.parse(e.data);
    if(m.type==='joined'){clear();currentMode=currentPhase=null;id=m.id;localStorage.setItem('mantel-room',intent?.room||$('code').value);joined=true;session=m.session;localStorage.setItem('mantel-session',session);$('joinScreen').hidden=true;$('pad').hidden=false;$('fighterName').textContent=m.name;document.documentElement.style.setProperty('--fighter',m.color);$('phoneStatus').textContent='Connected';$('joinError').textContent='';}
    if(m.type==='error'){if(joined){$('phoneNotice').hidden=false;$('phoneNotice').textContent=m.message;}else{$('joinError').textContent=m.message;intent=null;}}
    if(m.type==='removed'){clear();session=null;localStorage.removeItem('mantel-session');intent=null;joined=false;$('pad').hidden=true;$('joinScreen').hidden=false;$('joinError').textContent='The host removed your fighter. You can join again.';}
    if(m.type==='state')showState(m);
  };
  ws.onclose=e=>{clear();if(e.code===4001){joined=false;intent=null;id=null;$('pad').hidden=true;$('joinScreen').hidden=false;$('joinError').textContent='This controller was opened in another tab. Join again here to take control.';return;}$('phoneStatus').textContent='Reconnecting…';$('joinError').textContent='Connection lost. Reconnecting…';retry=setTimeout(connect,1200);};
}
$('joinForm').onsubmit=e=>{e.preventDefault();intent={name:$('name').value.trim(),room:$('code').value.trim()};localStorage.setItem('mantel-name',intent.name);if(ws?.readyState===1)send({type:'join',...intent,session});else {$('joinError').textContent='Connecting to the PC…';if(!ws||ws.readyState>=2)connect();}};
$('phoneTest').onclick=()=>send({type:'test-start'});
$('phoneNextGame').onclick=()=>send({type:currentTest?'end-test':'next-game',mode:$('phoneNextMode').value});
const swipe=$('swipePad');
swipe.onpointerdown=e=>{e.preventDefault();capture(swipe,e.pointerId);paddlePointer={id:e.pointerId,x:e.clientX,y:e.clientY,start:paddlePosition};};
swipe.onpointermove=e=>{if(paddlePointer?.id!==e.pointerId)return;const r=swipe.getBoundingClientRect(),vertical=currentMode==='pong',delta=vertical?(e.clientY-paddlePointer.y)/r.height:(e.clientX-paddlePointer.x)/r.width;inputs.paddle=Math.max(0,Math.min(1,paddlePointer.start+delta*1.4));send({type:'input',...inputs});};
swipe.onpointerup=swipe.onpointercancel=swipe.onlostpointercapture=e=>{if(paddlePointer?.id!==e.pointerId)return;paddlePointer=null;delete inputs.paddle;send({type:'input',...inputs});};
swipe.onkeydown=e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();inputs.paddle=Math.max(0,Math.min(1,paddlePosition+(['ArrowUp','ArrowLeft'].includes(e.key)?-.08:.08)));send({type:'input',...inputs});}};
for(const button of document.querySelectorAll('[data-key]')){
  button.oncontextmenu=e=>e.preventDefault();
  button.onpointerdown=e=>{e.preventDefault();capture(button,e.pointerId);pointers.set(e.pointerId,button.dataset.key);inputs[button.dataset.key]=true;button.classList.add('active');send({type:'input',...inputs});if(navigator.vibrate)navigator.vibrate(12);};
  const release=e=>{const key=pointers.get(e.pointerId);pointers.delete(e.pointerId);if(key){inputs[key]=[...pointers.values()].includes(key);button.classList.toggle('active',inputs[key]);send({type:'input',...inputs});}};
  button.onpointerup=release;button.onpointercancel=release;button.onlostpointercapture=release;
}
window.addEventListener('blur',clear);window.addEventListener('resize',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
setInterval(()=>{if(joined)send({type:'input',...inputs});},80);
$('phoneFullscreen').onclick=async()=>{try{await document.documentElement.requestFullscreen();}catch{$('phoneStatus').textContent='Rotate phone for a wider controller';}};
connect();
