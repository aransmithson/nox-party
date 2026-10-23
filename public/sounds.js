// Synthesized locally: no downloaded audio, and only the control desk plays it.
export function createGameSounds(){
  let context,master,engine,engineGain,noise,muted=false,volume=.35,lastPhase,lastMode,lastCount,played=0;
  let events=new Set(),items=new Set(),attacks=new Map(),lastDust=-10,lastBombBeat=null;
  function init(){
    if(context)return;
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    context=new Audio();master=context.createGain();master.gain.value=muted?0:volume;master.connect(context.destination);
    noise=context.createBuffer(1,context.sampleRate*.4,context.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    engine=context.createOscillator();engine.type='sawtooth';engine.frequency.value=45;engineGain=context.createGain();engineGain.gain.value=0;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=450;engine.connect(filter);filter.connect(engineGain);engineGain.connect(master);engine.start();
  }
  function wake(){init();if(context?.state==='suspended')context.resume().catch(()=>{});}
  function tone(frequency,duration=.12,type='sine',gain=.15,delay=0,end=frequency){
    if(!context||muted)return;const start=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
    o.type=type;o.frequency.setValueAtTime(frequency,start);o.frequency.exponentialRampToValueAtTime(Math.max(15,end),start+duration);
    g.gain.setValueAtTime(.001,start);g.gain.linearRampToValueAtTime(gain,start+.006);g.gain.exponentialRampToValueAtTime(.001,start+duration);
    o.connect(g);g.connect(master);o.start(start);o.stop(start+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};played++;
  }
  function hiss(duration=.1,gain=.13,frequency=900){
    if(!context||muted)return;const source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain(),t=context.currentTime;
    source.buffer=noise;filter.type='lowpass';filter.frequency.value=frequency;g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);
    source.connect(filter);filter.connect(g);g.connect(master);source.start();source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};played++;
  }
  function effect(type){
    if(type==='popcorn'){hiss(.35,.3,1300);tone(65,.35,'sine',.35,0,24);[600,800,1100].forEach((f,i)=>tone(f,.05,'triangle',.08,.12+i*.05));}
    else if(type==='pass'){tone(700,.09,'triangle',.12,0,1100);}
    else if(type==='brick'){tone(480+Math.random()*500,.12,'triangle',.13);hiss(.12,.09,2500);}
    else if(type==='paddle'||type==='bounce'){tone(type==='paddle'?400:250,.07,'sine',.12);}
    else if(type==='goal'){[523,659,784].forEach((f,i)=>tone(f,.2,'triangle',.14,i*.1));}
    else if(type==='pickup'){tone(650,.1,'sine',.15);tone(980,.18,'sine',.15,.09);}
    else if(type==='block'){tone(1150,.13,'triangle',.17,0,520);}
    else if(['hit','kick','fly','impact','barrier'].includes(type)){tone(type==='hit'?120:75,.16,'sine',.3,0,35);hiss(.13,.16,1600);}
    else if(type==='rocket'){hiss(.3,.15,1800);tone(150,.25,'sawtooth',.05,0,500);}
    else if(type==='banana'){tone(380,.18,'triangle',.15,0,100);}
  }
  function update(s){
    wake();if(!context)return;
    const changed=s.phase!==lastPhase||s.mode!==lastMode;
    if(changed){
      if(s.phase==='countdown'){events.clear();items.clear();attacks.clear();lastCount=null;lastDust=-10;}
      if(s.phase==='playing'){tone(880,.25,'sine',.17);tone(1320,.3,'sine',.12,.08);}
      if(s.phase==='finished')[523,659,784,1047].forEach((f,i)=>tone(f,.28,'triangle',.16,i*.13));
      lastPhase=s.phase;lastMode=s.mode;
    }
    if(s.phase==='countdown'){const count=Math.max(1,3-Math.floor(s.time));if(count!==lastCount){tone(440,.1,'sine',.14);lastCount=count;}}
    const speed=s.mode==='cars'&&s.phase==='playing'?Math.max(0,...s.players.map(p=>Math.hypot(p.car?.vx||0,p.car?.vy||0))):0;
    engine.frequency.setTargetAtTime(42+speed*.38,context.currentTime,.08);engineGain.gain.setTargetAtTime(speed>4?.035+speed/18000:0,context.currentTime,.08);
    if(s.phase!=='playing')return;
    if(s.mode==='potato'&&s.bomb){const fuse=s.bomb.fuse,interval=fuse<3?.16:fuse<6?.3:.6,beat=Math.floor(s.time/interval);if(beat!==lastBombBeat){lastBombBeat=beat;hiss(.06,.035,3500);tone(fuse<3?1100:700,.045,'sine',fuse<5?.1:.045);}}
    for(const [source,group]of [['game',s.events],['cars',s.carEffects],['arcade',s.arcadeEffects],['shelf',s.shelfballEffects]])for(const e of group||[]){
      const key=`${s.mode}:${source}:${e.id}`;if(events.has(key))continue;events.add(key);
      if(e.type==='dust'){if(s.time-lastDust>.22){hiss(.05,.035,500);lastDust=s.time;}}else if(e.type!=='skid')effect(e.type);
    }
    if(events.size>1000)events=new Set([...events].slice(-500));
    for(const item of s.items||[])if(!items.has(item.id)){items.add(item.id);effect(item.type);}
    for(const p of s.players){
      const attack=p.attack&&`${p.attack.start}:${p.attack.type}`;
      if(attack&&attacks.get(p.id)!==attack)hiss(.08,.06,1300);
      attacks.set(p.id,attack);
    }
  }
  return {update,wake,setMuted(value){muted=!!value;wake();if(master)master.gain.setTargetAtTime(muted?0:volume,context.currentTime,.02);},setVolume(value){volume=Math.max(0,Math.min(1,value));if(master)master.gain.setTargetAtTime(muted?0:volume,context.currentTime,.02);},status(){return {state:context?.state||'uninitialized',muted,volume,played};}};
}
export const gameSounds=createGameSounds();
