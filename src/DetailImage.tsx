import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PostEffects } from './PostEffects';

export function DetailImage({src,alt,imageRef}:{src:string;alt:string;imageRef:React.RefObject<HTMLImageElement|null>}){
  const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const el=root.current,img=imageRef.current;if(!el||!img)return;
    const renderer=new THREE.WebGLRenderer({alpha:false,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const canvas=renderer.domElement;canvas.className='detail-image-canvas';canvas.setAttribute('aria-hidden','true');el.appendChild(canvas);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
    const material=new THREE.MeshBasicMaterial(),geometry=new THREE.PlaneGeometry(2,2),mesh=new THREE.Mesh(geometry,material);scene.add(mesh);
    const post=new PostEffects();let frame=0,last=0,loaded=false,remaining=0,dead=false;
    const render=(time:number)=>{if(dead)return;const dt=Math.min((time-last)/1000,.05)||1/60;last=time;post.render(renderer,scene,camera,dt,0);remaining-=dt;if(remaining>0)frame=requestAnimationFrame(render);else{frame=0;canvas.style.opacity='0';}};
    const resize=()=>{const r=img.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);post.resize(r.width,r.height,renderer);};
    const move=(e:PointerEvent)=>{if(!loaded||parseFloat(getComputedStyle(img).opacity)<.9||e.pointerType!=='mouse'||innerWidth<650||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const r=img.getBoundingClientRect();post.pointer(e.clientX-r.left,e.clientY-r.top);remaining=1.8;canvas.style.opacity='1';if(!frame)frame=requestAnimationFrame(render);};
    new THREE.TextureLoader().load(src,texture=>{if(dead){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;material.map=texture;material.needsUpdate=true;loaded=true;resize();});
    const observer=new ResizeObserver(resize);observer.observe(img);window.addEventListener('pointermove',move,{passive:true});
    return()=>{dead=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('pointermove',move);canvas.remove();post.dispose();geometry.dispose();material.map?.dispose();material.dispose();renderer.dispose();};
  },[src,imageRef]);
  return <div ref={root} className="detail-image"><img ref={imageRef} src={src} alt={alt}/></div>;
}
