import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PostEffects } from './PostEffects';

/** A finely tessellated text surface, preserving the DOM's wrapping and font. */
export function TextLens({title,description}:{title:string;description:string}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const container=root.current;if(!container)return;
    const cleanup:Array<()=>void>=[];
    let disposed=false;
    const setup=()=>{
      if(disposed)return;
      container.querySelectorAll<HTMLElement>('h1,p').forEach(el=>{
        const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
        renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0,0);
        const canvas=renderer.domElement;canvas.className='text-lens-canvas';canvas.setAttribute('aria-hidden','true');el.appendChild(canvas);
        const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(0,1,0,1,-100,100);
        const post=new PostEffects(true);
        const material=new THREE.MeshBasicMaterial({transparent:true});
        const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,120,30),material);scene.add(mesh);
        let w=1,h=1,frame=0,last=0,remaining=0;
        const rebuild=()=>{
          const style=getComputedStyle(el),node=el.firstChild;
          if(!node||node.nodeType!==Node.TEXT_NODE)return;
          const pad=32;w=el.clientWidth+pad*2;h=el.clientHeight+pad*2;
          const bitmap=document.createElement('canvas'),dpr=Math.min(devicePixelRatio,2);bitmap.width=Math.ceil(w*dpr);bitmap.height=Math.ceil(h*dpr);
          const ctx=bitmap.getContext('2d')!;ctx.scale(dpr,dpr);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.fillStyle='#000';ctx.textBaseline='alphabetic';ctx.letterSpacing=style.letterSpacing;
          const text=node.textContent||'',box=el.getBoundingClientRect(),range=document.createRange();
          const lines:Array<{text:string,x:number,y:number}>=[];
          for(let i=0;i<text.length;i++){range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();let line=lines.at(-1);if(!line||Math.abs(line.y-(r.top-box.top))>2){line={text:'',x:r.left-box.left,y:r.top-box.top};lines.push(line);}line.text+=text[i];}
          // Canvas and DOM use the same font metrics; align the glyph ink baseline.
          const metrics=ctx.measureText('Hg');
          const correction=metrics.fontBoundingBoxAscent;
          for(const line of lines)ctx.fillText(line.text,line.x+pad,line.y+pad+correction);
          material.map?.dispose();material.map=new THREE.CanvasTexture(bitmap);material.needsUpdate=true;
          renderer.setSize(w,h,false);canvas.style.removeProperty('display');canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;canvas.style.left=`-${pad}px`;canvas.style.top=`-${pad}px`;
          mesh.geometry.dispose();mesh.geometry=new THREE.PlaneGeometry(w,h,120,30);mesh.position.set(w/2,h/2,0);mesh.rotation.x=Math.PI;
          camera.left=0;camera.right=w;camera.top=0;camera.bottom=h;camera.updateProjectionMatrix();post.resize(w,h,renderer);
        };
        const tick=(time:number)=>{
          const dt=Math.min((time-last)/1000,.05)||1/60;last=time;
          post.render(renderer,scene,camera,dt,0);remaining-=dt;
          if(remaining>0)frame=requestAnimationFrame(tick);else{frame=0;el.classList.remove('text-lens-active');}
        };
        const move=(e:PointerEvent)=>{if(e.pointerType!=='mouse'||innerWidth<650||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=el.getBoundingClientRect();post.pointer(e.clientX-r.left+32,e.clientY-r.top+32);remaining=1.8;el.classList.add('text-lens-active');if(!frame)frame=requestAnimationFrame(tick);};
        window.addEventListener('pointermove',move,{passive:true});
        const observer=new ResizeObserver(rebuild);observer.observe(el);rebuild();
        cleanup.push(()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('pointermove',move);el.classList.remove('text-lens-active');canvas.remove();material.map?.dispose();post.dispose();mesh.geometry.dispose();material.dispose();renderer.dispose();});
      });
    };
    document.fonts.ready.then(setup);
    return()=>{disposed=true;cleanup.forEach(fn=>fn());};
  },[title,description]);
  return <div ref={root} className="text-lens"><h1>{title}</h1><p>{description}</p></div>;
}

