import {CAMERA_VIEWS} from './playground-cameras.js';

// CSS pixels throughout. WebGLRenderer applies its bounded pixel ratio once.
export function viewportRects(width,height,layout,selected){
  if(layout==='single')return [{id:selected,x:0,y:0,width,height}];
  const left=Math.floor(width/2),top=Math.floor(height/2);
  return Object.keys(CAMERA_VIEWS).map((id,i)=>({id,x:i%2?left:0,y:i<2?0:top,
    width:i%2?width-left:left,height:i<2?top:height-top}));
}
export function pointerNdc(rect,x,y){return {x:(x-rect.x)/rect.width*2-1,y:1-(y-rect.y)/rect.height*2};}

export class PlaygroundViewports{
  constructor(host){
    this.host=host;this.selected='perspective';this.layout='quad';this.choice=null;this.rects=[];this.targets=new Map();
    for(const [id,view] of Object.entries(CAMERA_VIEWS)){
      const surface=document.createElement('div');surface.className='cameraSurface';surface.dataset.camera=id;
      surface.tabIndex=0;surface.setAttribute('role','region');surface.setAttribute('aria-label',view.label);
      const label=document.createElement('span');label.className='viewLabel';label.textContent=view.label;surface.append(label);
      host.append(surface);this.targets.set(id,surface);
    }
  }
  resize(width,height,locked=false){
    this.width=width;this.height=height;
    if(!locked)this.layout=this.choice||(width>=560&&height>=400?'quad':'single');
    this.rects=viewportRects(width,height,this.layout,this.selected);
    for(const [id,surface] of this.targets){
      const rect=this.rects.find(r=>r.id===id);surface.hidden=!rect;
      surface.classList.toggle('selected',id===this.selected);
      if(rect)Object.assign(surface.style,{left:rect.x+'px',top:rect.y+'px',width:rect.width+'px',height:rect.height+'px'});
    }
    return this.rects;
  }
  select(id){this.selected=id;return this.resize(this.width,this.height);}
  setLayout(layout){this.choice=layout;return this.resize(this.width,this.height);}
  hit(x,y){return this.rects.find(r=>x>=r.x&&y>=r.y&&x<r.x+r.width&&y<r.y+r.height);}
  rect(id=this.selected){return this.rects.find(r=>r.id===id);}
  snapshot(){return {layout:this.layout,selected:this.selected,views:this.rects.map(r=>({...r}))};}
  dispose(){for(const surface of this.targets.values())surface.remove();this.targets.clear();}
}
