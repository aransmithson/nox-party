import {createRenderer} from './renderer.js';
const render=createRenderer(document.getElementById('arena').getContext('2d'));
let state={players:[],platforms:[],events:[],phase:'lobby'},output={blank:false,calibration:{enabled:false,platforms:[]}},ws;
window.mantelDesktop?.onOutput(value=>output=value);
if(window.mantelDesktop)output=await window.mantelDesktop.state();
function connect(){ws=new WebSocket(`ws://${location.host}`);ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='state')state=m;};ws.onclose=()=>{state={players:[],platforms:[],events:[],phase:'lobby'};setTimeout(connect,1000);};}
function frame(t){render(output.calibration?.enabled&&output.calibration?.breakout?{...state,breakoutLayout:output.calibration.breakout}:output.calibration?.enabled&&output.calibration?.track?{...state,track:output.calibration.track}:state,t,{projection:true,blank:output.blank,calibrating:output.calibration?.enabled,surfaces:output.calibration?.enabled?output.calibration.platforms:state.platforms,selected:output.calibration?.selected||0});requestAnimationFrame(frame);}
connect();requestAnimationFrame(frame);
