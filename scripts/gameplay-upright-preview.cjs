// Local-only gameplay production preview; never takes over an occupied port.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve('dist-gameplay');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.map':'application/json','.webm':'video/webm'};
const server=http.createServer((req,res)=>{
  let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
  if(!pathname.startsWith('/goblin/')){res.writeHead(404).end();return;}
  const relative=pathname.slice('/goblin/'.length),file=path.resolve(root,relative.endsWith('/')?relative+'index.html':relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{
    if(!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
});
server.on('error',e=>{console.error('Preview could not start:',e.message);process.exitCode=1;});
server.listen(4174,'127.0.0.1',()=>console.log('Gameplay B preview: http://127.0.0.1:4174/goblin/gameplay/upright/'));
