import {execSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';

// Include all application/build inputs and the exact validation harness, not just physics.
export function standingBuild(){
  const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
  const files=[...walk('src'),...walk('labs'),...walk('public'),...walk('tests'),...walk('scripts'),
    'index.html','vite.config.js','package.json','package-lock.json',
    ...['baseline-config.json','config.schema.json','result.schema.json'].map(n=>'docs/research/standing-lab/'+n)].sort();
  const hash=createHash('sha256');for(const file of files)hash.update(file).update('\0').update(readFileSync(file)).update('\0');
  const git_commit=execSync('git rev-parse HEAD',{encoding:'utf8'}).trim();
  return {git_commit,dirty:!!execSync('git status --porcelain',{encoding:'utf8'}).trim(),build_id:git_commit+':'+hash.digest('hex')};
}
