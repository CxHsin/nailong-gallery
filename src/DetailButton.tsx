import { useEffect, useRef, useId, type ReactNode } from 'react';
import gsap from 'gsap';

// Reference marks travel as separate strokes; the circle clips them at its rim.
export function DetailButton({kind,children,className='',label,onClick}:{kind?:'cross'|'arrow';children?:ReactNode;className?:string;label?:string;onClick?:()=>void}) {
  const root=useRef<HTMLButtonElement>(null);
  const clipId=useId().replace(/:/g,'');
  const motion=useRef({out:0,inside:0,hover:0,x:0});
  const draw=()=>{
    const el=root.current;if(!el)return;
    const {out,inside,hover}=motion.current;
    el.style.setProperty('--disc',String(hover));
    if(!kind){
      const w=el.offsetWidth,h=el.offsetHeight,svg=el.querySelector<SVGSVGElement>('.tag-surface');if(!svg||!w||!h)return;
      svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
      const cx=w/2+motion.current.x*w*.33,cy=h/2,r=w/2;
      const warp=(x:number,y:number,strength=.33)=>{const qx=x-cx,qy=y-cy,k=Math.max(0,1-(qx*qx+qy*qy)/(r*r));return [x+qx*strength*hover*k*k,y+qy*strength*hover*k*k];};
      const points:number[][]=[];
      for(let i=0;i<=32;i++){const a=-Math.PI/2+Math.PI*i/32;points.push(warp(w-h/2+Math.cos(a)*h/2,h/2+Math.sin(a)*h/2));}
      for(let i=0;i<=32;i++){const a=Math.PI/2+Math.PI*i/32;points.push(warp(h/2+Math.cos(a)*h/2,h/2+Math.sin(a)*h/2));}
      const path=points.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]}`).join(' ')+'Z';
      svg.querySelectorAll('path').forEach(p=>p.setAttribute('d',path));
      const disc=svg.querySelector('circle')!;disc.setAttribute('cx',String(cx));disc.setAttribute('cy',String(cy));disc.setAttribute('r',String(hover*Math.hypot(w,h)));
      const style=getComputedStyle(el),ctx=document.createElement('canvas').getContext('2d')!;ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const word=String(children),width=ctx.measureText(word).width;let x=(w-width)/2;
      const glyphs=svg.querySelectorAll<SVGTextElement>('text');
      for(let i=0;i<word.length;i++){
        const cw=ctx.measureText(word[i]).width,pos=warp(x+cw/2,h/2,.528),qx=x+cw/2-cx,k=Math.max(0,1-qx*qx/(r*r));
        const scale=1+.528*hover*k*k;
        for(const glyph of [glyphs[i],glyphs[i+word.length]]){glyph.setAttribute('x',String(x+cw/2));glyph.setAttribute('y',String(h/2));glyph.setAttribute('transform',`translate(${pos[0]} ${pos[1]}) scale(${scale}) translate(${-(x+cw/2)} ${-h/2})`);}
        x+=cw;
      }
    }
    const clamp=(v:number)=>Math.max(0,Math.min(1,v));
    const lag=(v:number,d:number)=>clamp((v-d)/(1-d));
    el.querySelectorAll<SVGLineElement>('line').forEach((line,index)=>{
      const part=index% (kind==='cross'?2:3),incoming=index>=(kind==='cross'?2:3);
      const progress=kind==='cross'?lag(incoming?inside:out,part*.16):incoming?lag(inside,part===0?0:part===1?.22:.374):lag(out,part===0?.22:0);
      const at=incoming?progress-1:progress;
      const direction=kind==='cross'?(part===0?[.7071,-.7071]:[-.7071,-.7071]):part===0?[.7071,-.7071]:part===1?[1,0]:[0,-1];
      line.setAttribute('transform',`translate(${direction[0]*at*95} ${direction[1]*at*95})${kind==='cross'?` translate(50 50) scale(${1+.5*Math.abs(at)}) translate(-50 -50)`:''}`);
    });
  };
  const hover=(active:boolean)=>{
    const p=motion.current;
    gsap.to(p,{hover:active?1:0,duration:active?.7:.5,ease:'expo.out',overwrite:'auto',onUpdate:draw});
    gsap.to(p,{out:active?1:0,duration:active?.75:1,ease:'expo.out',overwrite:'auto',onUpdate:draw});
    gsap.to(p,{inside:active?1:0,duration:active?1:.75,ease:'expo.out',overwrite:'auto',onUpdate:draw});
  };
  useEffect(()=>{draw();const observer=new ResizeObserver(draw);if(root.current)observer.observe(root.current);document.fonts.ready.then(draw);return()=>{observer.disconnect();gsap.killTweensOf(motion.current);};},[]);
  const strokes=kind==='cross'?[[41.515,58.485,58.485,41.515],[58.485,58.485,41.515,41.515]]:[[42.929,57.071,57.071,42.929],[57.071,42.929,46.071,42.929],[57.071,42.929,57.071,53.929]];
  return <button ref={root} className={`detail-feedback ${className}`} aria-label={label??(!kind?String(children):undefined)} onClick={onClick} onPointerMove={e=>{if(kind)return;const r=e.currentTarget.getBoundingClientRect();gsap.to(motion.current,{x:(e.clientX-r.left)/r.width-.5,duration:.25,onUpdate:draw});}} onPointerEnter={()=>hover(true)} onPointerLeave={()=>hover(false)} onFocus={()=>hover(true)} onBlur={()=>hover(false)}>
    {kind&&<span className="pill-fill" aria-hidden="true"/>}
    {kind?<svg viewBox="0 0 100 100" aria-hidden="true">{[...strokes,...strokes].map((p,i)=><line key={i} x1={p[0]} y1={p[1]} x2={p[2]} y2={p[3]} vectorEffect="non-scaling-stroke"/>)}</svg>:<><span className="tag-size">{children}</span><svg className="tag-surface" aria-hidden="true"><defs><clipPath id={clipId}><circle/></clipPath></defs><path fill="#eee"/><path fill="#000" clipPath={`url(#${clipId})`}/>{[0,1].flatMap(copy=>Array.from(String(children)).map((letter,i)=><text key={`${copy}-${i}`} textAnchor="middle" dominantBaseline="central" fill={copy?'#fff':'#000'} clipPath={copy?`url(#${clipId})`:undefined}>{letter}</text>))}</svg></>}
  </button>;
}
