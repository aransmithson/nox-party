const {readdirSync}=require('node:fs');
const {join}=require('node:path');
const {spawnSync}=require('node:child_process');

let checked=0;
for(const directory of ['.','public','desktop','test','test-support','scripts']){
  for(const entry of readdirSync(directory,{withFileTypes:true})){
    if(!entry.isFile()||! /\.(js|cjs)$/.test(entry.name))continue;
    const file=join(directory,entry.name),result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});
    if(result.error)throw result.error;
    if(result.status!==0)process.exit(result.status||1);
    checked++;
  }
}
console.log(`Syntax checked ${checked} JavaScript files.`);
