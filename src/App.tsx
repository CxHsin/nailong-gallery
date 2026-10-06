import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { artworks } from './data';
import { Gallery, type GalleryState, type Origin } from './Gallery';
import { sheetEase } from './motion';
import { DetailButton } from './DetailButton';
import { TextLens } from './TextLens';
import { DetailImage } from './DetailImage';

type View = { type:'art'; index:number; origin:Origin; fromIndex?:boolean } | { type:'about'|'collection'|'all' };
const rect = (element:Element):Origin => {const r=element.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};};
export function App(){
  const [view,setView]=useState<View|null>(null),[ready,setReady]=useState(false);
  const [indexPreview,setIndexPreview]=useState<{index:number;x:number;y:number}|null>(null);
  const state=useRef<GalleryState>({flight:null,mode:'featured',reveal:0,hole:0});
  const panel=useRef<HTMLDivElement>(null),hero=useRef<HTMLImageElement>(null),info=useRef<HTMLDivElement>(null);
  const current=useRef<View|null>(null),busy=useRef(false),animation=useRef<gsap.core.Timeline|null>(null),pendingClose=useRef(false);
  const switchDirection=useRef(0),switchOffset=useRef(0);
  current.current=view;
  const open=useCallback((next:View)=>{
    if(busy.current)return;
    busy.current=true;
    const hash=next.type==='art'?`#nailong-${next.index+1}`:`#${next.type}`;
    if(current.current)history.replaceState({gallery:true},'',hash);else history.pushState({gallery:true},'',hash);
    if(next.type!=='art')state.current.mode=next.type;
    setView(next);
  },[]);
  const close=useCallback((fromHistory=false)=>{
    if(!current.current)return;
    if(busy.current){pendingClose.current=true;return;}
    busy.current=true;pendingClose.current=false;
    const v=current.current;
    const done=()=>{state.current.flight=null;state.current.mode='featured';state.current.reveal=0;state.current.hole=0;setView(null);busy.current=false;if(fromHistory)history.replaceState(null,'',location.pathname);else if(history.state?.gallery)history.back();};
    const t=gsap.timeline({onComplete:done});animation.current=t;
    if(v.type==='art'&&state.current.flight&&!v.fromIndex){
      if(hero.current)state.current.flight.hero=rect(hero.current);
      t.to('.detail-copy,.close,.panel-progress',{opacity:0,duration:.2},0);
      t.to('.related-sheet',{opacity:0,duration:.4},0);
      t.to(hero.current,{opacity:0,duration:.12},0);
      t.to(panel.current,{backgroundColor:'rgba(255,255,255,0)',duration:.12},0);
      t.to(state.current.flight,{progress:0,duration:1,ease:sheetEase},0);
      t.set(panel.current,{opacity:0},.15);
    }else{
      t.to(info.current??panel.current,{opacity:0,scale:.96,duration:.4,ease:'power2.in'},0);
      t.to(state.current,{reveal:0,duration:.75,ease:'power3.inOut'},0);
      t.to(state.current,{hole:0,duration:.75,ease:sheetEase},0);
    }
  },[]);
  const changeArt=useCallback((direction:number)=>{
    const active=current.current;
    if(busy.current||active?.type!=='art'||!panel.current)return;
    busy.current=true;
    // Hand off the landed WebGL sheet to matching HTML before moving it.
    state.current.flight=null;state.current.reveal=1;
    gsap.set(panel.current,{backgroundColor:'#fff',clipPath:'none'});
    gsap.set(hero.current,{opacity:1});
    const index=(active.index+direction+artworks.length)%artworks.length;
    const outgoing=panel.current.cloneNode(true) as HTMLDivElement;
    outgoing.querySelectorAll('canvas').forEach(c=>c.remove());outgoing.querySelectorAll('.text-lens-active').forEach(c=>c.classList.remove('text-lens-active'));
    outgoing.removeAttribute('role');outgoing.removeAttribute('aria-modal');
    outgoing.setAttribute('aria-hidden','true');outgoing.inert=true;
    outgoing.style.pointerEvents='none';
    panel.current.parentElement!.appendChild(outgoing);
    gsap.to(outgoing.querySelectorAll('.detail-copy,.art-content,.close,.panel-progress'),{opacity:0,duration:.4,ease:'power2.out'});
    gsap.to(outgoing,{x:-direction*innerWidth,rotation:0,scaleY:.8,backgroundColor:'rgba(255,255,255,.3)',duration:1.25,ease:sheetEase,onComplete:()=>outgoing.remove()});
    switchDirection.current=direction;
    history.replaceState({gallery:true},'',`#nailong-${index+1}`);
    setView({type:'art',index,origin:active.origin,fromIndex:true});
  },[]);
  useLayoutEffect(()=>{
    if(!view)return;
    busy.current=true;
    const completed=()=>{busy.current=false;if(pendingClose.current)close();};
    const t=gsap.timeline({onComplete:completed});animation.current=t;
    if(view.type==='art'){
      panel.current!.scrollTop=0;
      const previous=state.current.mode;
      gsap.set(panel.current,{scale:1,scaleY:1,x:0,rotation:0});
      state.current.mode='featured';state.current.reveal=0;state.current.hole=0;
      if(switchDirection.current){
        const direction=switchDirection.current;switchDirection.current=0;const offset=switchOffset.current;switchOffset.current=0;
        state.current.flight=null;state.current.reveal=1;
        gsap.set(panel.current,{opacity:1,backgroundColor:'#fff',clipPath:'none'});
        gsap.set('.detail-copy,.art-content,.close,.panel-progress',{opacity:1});
        gsap.set(hero.current,{opacity:1});
        t.fromTo(panel.current,{x:direction*innerWidth+offset,rotation:0,scaleY:.8,backgroundColor:'rgba(255,255,255,.3)'},{x:0,rotation:0,scaleY:1,backgroundColor:'#fff',duration:1.25,ease:sheetEase,clearProps:'transform'},0);
        t.fromTo(panel.current!.querySelectorAll('.detail-copy h1,.detail-copy p'),{opacity:0,y:24},{opacity:1,y:0,duration:1.1,stagger:.1,ease:'expo.out',clearProps:'transform'},.25);
        t.fromTo(panel.current!.querySelectorAll('.art-content'),{opacity:0,y:40},{opacity:1,y:0,duration:1.25,ease:'expo.out',clearProps:'transform'},.25);
        t.fromTo(panel.current!.querySelectorAll('.tags>*,.close'),{opacity:0,scale:0},{opacity:1,scale:1,duration:.85,stagger:.075,ease:'expo.out',clearProps:'transform'},.5);
      }else if(view.fromIndex||previous==='all'){
        state.current.flight=null;
        state.current.reveal=1;
        gsap.set(panel.current,{opacity:1,backgroundColor:'#fff'});
        t.fromTo(panel.current,{clipPath:'circle(0% at 50% 50%)'},{clipPath:'circle(100% at 50% 50%)',duration:1,ease:'power3.inOut'},0);
        t.fromTo('.detail-copy,.art-content',{opacity:0,y:15},{opacity:1,y:0,duration:.7,clearProps:'transform'},.35);
      }else{
        const flight={index:view.index,progress:0,panel:rect(panel.current!),hero:rect(hero.current!)};
        state.current.flight=flight;
        gsap.set(panel.current,{opacity:1,backgroundColor:'rgba(255,255,255,0)'});
        gsap.set('.detail-copy,.close,.panel-progress', {opacity:0});gsap.set(hero.current,{opacity:0});
        t.to(flight,{progress:1,duration:1.25,ease:sheetEase},0);
        t.fromTo('.detail-copy h1',{y:24,opacity:0},{y:0,opacity:1,duration:1.25,ease:'expo.out',clearProps:'transform'},.25);
        t.to('.detail-copy,.panel-progress',{opacity:1,duration:.45},.35);
        t.fromTo('.tags>*,.close',{scale:0,opacity:0},{scale:1,opacity:1,duration:.85,stagger:.075,ease:'expo.out',clearProps:'transform'},.5);
        t.fromTo('.related-sheet',{opacity:0},{opacity:1,duration:.7},.25);
      }
    }else{
      state.current.flight=null;
      t.to(state.current,{reveal:view.type==='all'?1:0,duration:1,ease:'power3.inOut'},0);
      t.to(state.current,{hole:view.type==='all'?0:1,duration:1,ease:sheetEase},0);
      t.fromTo(info.current,{opacity:0,clipPath:'circle(0% at 50% 50%)'},{opacity:1,clipPath:'circle(100% at 50% 50%)',duration:1,ease:'power3.inOut'},0);
    }
    return()=>{t.kill();};
  },[view,close]);
  useEffect(()=>{
    const el=panel.current;if(view?.type!=='art'||!el)return;
    let startX=0,startY=0,dx=0,lastX=0,lastTime=0,velocity=0,pointer=-1,dragging=false,vertical=false,preview:HTMLDivElement|null=null,direction=0;
    const removePreview=()=>{preview?.remove();preview=null;};
    const down=(e:PointerEvent)=>{
      if(busy.current||e.button!==0||(e.target as Element).closest('button,a'))return;
      pointer=e.pointerId;startX=lastX=e.clientX;startY=e.clientY;lastTime=e.timeStamp;dx=velocity=0;dragging=vertical=false;
    };
    const move=(e:PointerEvent)=>{
      if(e.pointerId!==pointer||vertical)return;
      const x=e.clientX-startX,y=e.clientY-startY;
      if(!dragging){if(Math.abs(y)>8&&Math.abs(y)>Math.abs(x)){vertical=true;return;}if(Math.abs(x)<8)return;
        dragging=true;el.setPointerCapture(pointer);state.current.flight=null;state.current.reveal=1;
        gsap.set(el,{backgroundColor:'#fff',clipPath:'none'});gsap.set(hero.current,{opacity:1});
      }
      e.preventDefault();velocity=(e.clientX-lastX)/Math.max(1,e.timeStamp-lastTime);lastX=e.clientX;lastTime=e.timeStamp;dx=x;
      const nextDirection=dx<0?1:-1;
      if(direction!==nextDirection||!preview){
        removePreview();direction=nextDirection;preview=el.cloneNode(true) as HTMLDivElement;preview.inert=true;preview.setAttribute('aria-hidden','true');preview.removeAttribute('role');preview.style.pointerEvents='none';
        preview.querySelectorAll('canvas').forEach(c=>c.remove());preview.querySelectorAll('.text-lens-active').forEach(c=>c.classList.remove('text-lens-active'));
        const next=artworks[(view.index+direction+20)%20];preview.querySelector('h1')!.textContent=next.title;const image=preview.querySelector('img')!;image.src=next.image;image.style.opacity='1';
        el.parentElement!.appendChild(preview);
      }
      const progress=Math.min(1,Math.abs(dx)/innerWidth);
      gsap.set(el,{x:dx,rotation:0,scaleY:1-progress*.2,backgroundColor:`rgba(255,255,255,${1-progress*.7})`});
      gsap.set(el.querySelectorAll('.detail-copy,.art-content,.close,.panel-progress'),{opacity:1-progress});
      gsap.set(preview,{x:direction*innerWidth+dx,rotation:0,scaleY:.8+progress*.2,backgroundColor:`rgba(255,255,255,${.3+progress*.7})`});
      gsap.set(preview!.querySelectorAll('.detail-copy,.art-content,.close,.panel-progress'),{opacity:0});
    };
    const up=(e:PointerEvent)=>{
      if(e.pointerId!==pointer)return;pointer=-1;
      if(!dragging)return;dragging=false;removePreview();if(e.timeStamp-lastTime>120)velocity=0;
      if(Math.abs(dx)>innerWidth*.18||(Math.abs(dx)>35&&Math.abs(velocity)>.45)){switchOffset.current=dx;changeArt(dx<0?1:-1);}
      else {gsap.to(el,{x:0,rotation:0,scaleY:1,backgroundColor:'#fff',duration:.6,ease:'expo.out',clearProps:'transform'});gsap.to(el.querySelectorAll('.detail-copy,.art-content,.close,.panel-progress'),{opacity:1,duration:.6,ease:'expo.out'});}
    };
    const cancel=()=>{pointer=-1;dragging=false;removePreview();gsap.to(el,{x:0,rotation:0,scaleY:1,backgroundColor:'#fff',duration:.6,ease:'expo.out',clearProps:'transform'});gsap.to(el.querySelectorAll('.detail-copy,.art-content,.close,.panel-progress'),{opacity:1,duration:.6});};
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);
    return()=>{removePreview();el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);};
  },[view,changeArt]);
  useEffect(()=>{
    const pop=()=>{if(busy.current)animation.current?.progress(1);close(true);};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};
    const resize=()=>{if(state.current.flight&&panel.current&&hero.current){state.current.flight.panel=rect(panel.current);state.current.flight.hero=rect(hero.current);}};
    window.addEventListener('popstate',pop);window.addEventListener('keydown',key);window.addEventListener('resize',resize);
    return()=>{window.removeEventListener('popstate',pop);window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);};
  },[close]);
  useEffect(()=>{
    const match=location.hash.match(/^#nailong-(\d+)$/);const id=match?Number(match[1]):0;
    const hash=location.hash.slice(1);
    history.replaceState(null,'',location.pathname);
    if(id>=1&&id<=20)open({type:'art',index:id-1,origin:{left:innerWidth*.3,top:innerHeight*.3,width:innerWidth*.4,height:innerHeight*.4},fromIndex:true});
    else if(hash==='all'||hash==='about'||hash==='collection')open({type:hash});
  },[open]);
  useEffect(()=>{
    if(!view)return;const el=panel.current??info.current;if(!el)return;const previous=document.activeElement as HTMLElement;el.focus({preventScroll:true});
    const trap=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const scope=view.type==='art'?el.parentElement!:el;const nodes=Array.from(scope.querySelectorAll<HTMLElement>('.related-sheet,.art-panel button,.art-panel a, .info-layer button,.info-layer a')).filter(n=>n.getClientRects().length>0);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===el)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
    el.addEventListener('keydown',trap);return()=>{el.removeEventListener('keydown',trap);previous?.focus({preventScroll:true});};
  },[view]);
  useEffect(()=>{
    const el=panel.current;
    if(view?.type!=='art'||!el)return;
    const syncHero=()=>{if(state.current.flight&&hero.current)state.current.flight.hero=rect(hero.current);};
    el.addEventListener('scroll',syncHero,{passive:true});
    const observer=new ResizeObserver(syncHero);
    if(hero.current)observer.observe(hero.current);
    return()=>{el.removeEventListener('scroll',syncHero);observer.disconnect();};
  },[view]);
  return <main>
    <Gallery state={state.current} onOpen={(index,origin)=>open({type:'art',index,origin})} onReady={()=>setReady(true)}/>
    <header className={`navigation ${view?.type==='art'?'nav-hidden':''}`}><button className="wordmark" onClick={()=>view?close():undefined}>NAILONG GALLERY</button><button onClick={()=>view?.type==='about'||view?.type==='collection'?close():open({type:'about'})}>{view?.type==='about'||view?.type==='collection'?'CLOSE':'ABOUT'}</button></header>
    <footer className={`navigation ${view?.type==='art'?'nav-hidden':''}`}><div><button className={view?.type==='all'?'muted':''} onClick={()=>view?close():undefined}>FEATURED</button><span className="slash">/</span><button className={view?.type==='all'?'':'muted'} onClick={()=>open({type:'all'})}>ALL</button></div><button onClick={()=>view?.type==='collection'?close():open({type:'collection'})}>COLLECTION</button></footer>
    {!ready&&<div className="loading"><span className="load-ring"/></div>}
    {view?.type==='art'&&<><button className="related-sheet related-left" aria-label={`Previous portrait: ${artworks[(view.index+19)%20].title}`} onClick={()=>changeArt(-1)}/><button className="related-sheet related-right" aria-label={`Next portrait: ${artworks[(view.index+1)%20].title}`} onClick={()=>changeArt(1)}/><div ref={panel} className="panel art-panel" role="dialog" aria-modal="true" aria-label={artworks[view.index].title} tabIndex={-1}>
      <DetailButton className="close" kind="cross" label="Close panel" onClick={()=>close()}/>
      <aside className="detail-copy"><TextLens title={artworks[view.index].title} description="A playful portrait from the Nailong collection. One little dragon, reimagined in a world of art and imagination."/><div className="tags"><DetailButton className="external-mark" kind="arrow" label="Portrait arrow"/><DetailButton className="detail-tag">NAILONG</DetailButton><span>{String(view.index+1).padStart(2,'0')}</span></div></aside>
      <div className="art-content"><DetailImage imageRef={hero} src={artworks[view.index].image} alt={artworks[view.index].title}/></div>
      <span className="panel-progress" aria-hidden="true"/>
    </div></>}
    {view&&view.type!=='art'&&<div ref={info} className={`info-layer ${view.type}`} role="dialog" aria-modal="true" aria-label={view.type} tabIndex={-1}>
      {view.type==='all'?<><div className="full-index">{artworks.map((art,index)=><span key={art.id}><button onPointerMove={e=>{if(e.pointerType==='mouse')setIndexPreview({index,x:e.clientX,y:e.clientY});}} onPointerLeave={()=>setIndexPreview(null)} onClick={e=>{setIndexPreview(null);open({type:'art',index,origin:rect(e.currentTarget),fromIndex:true});}}>{art.title}</button>{index<19&&<span className="index-dot"> · </span>}</span>)}</div>{indexPreview&&<img className="index-preview" src={artworks[indexPreview.index].image} alt="" style={{left:Math.min(innerWidth-190,Math.max(10,indexPreview.x+20)),top:Math.min(innerHeight-140,Math.max(10,indexPreview.y+20))}}/>}</>:<div className="ring-copy">{view.type==='about'?<><p>Nailong Gallery. Twenty playful portraits of a wonderfully curious little dragon, reimagined through art, imagination and unexpected worlds.</p><small>20 PORTRAITS — ONE LITTLE DRAGON</small><div className="ring-links"><button onClick={()=>open({type:'all'})}>ALL PORTRAITS</button><button onClick={()=>close()}>EXPLORE</button></div></>:<><p>A collection of twenty images.<br/>A familiar little dragon. Boundless imagination.<br/>Choose a portrait and take a closer look.</p><div className="ring-links"><button onClick={()=>open({type:'all'})}>VIEW COLLECTION ↗</button></div></>}</div>}
      <button className="sr-only" onClick={()=>close()}>Close panel</button>
    </div>}
    <div className="sr-only"><h1>Nailong Gallery</h1><p>Scroll or drag to browse. Click an image to open it.</p></div>
  </main>;
}
