import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { artworks } from './data';
import { PostEffects } from './PostEffects';
import { GalleryMotion } from './GalleryMotion';
export type Origin = { left: number; top: number; width: number; height: number };
export type Flight = { index: number; progress: number; panel: Origin; hero: Origin };
export type GalleryState = { flight: Flight | null; mode: 'featured' | 'all' | 'about' | 'collection'; reveal: number; hole:number; boot?:number; intro?:number };
const smooth = (a: number, b: number, x: number) => { const t = THREE.MathUtils.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };

// One continuous world-space surface carries both images and their titles.
export function Gallery({ state, onOpen, onReady, onProgress }: { state: GalleryState; onOpen: (index: number, origin: Origin) => void; onReady: () => void; onProgress?:(progress:number)=>void }) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef({ state, onOpen, onReady, onProgress }); props.current = { state, onOpen, onReady, onProgress };
  useEffect(() => {
    const el=host.current!;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(53.4,1,.1,2000);camera.position.z=41.18;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,1);el.appendChild(renderer.domElement);
    const post=new PostEffects();
    let width=1,height=1,halfW=1,halfH=1,cardW=1,cardH=1,gap=1;
    const motion=new GalleryMotion();
    let current=0,speed=0,dragging=false,travel=0,lastX=0,lastY=0,downIndex=-1,initialized=false;
    let bendVelocity=0,lastIntro=-1;
    let pointerDirty=true,geometryDirty=true,hadFlight=false;
    const pointer=new THREE.Vector2(4,4);let hover=-1,disposed=false,loaded=0,frame=0,previous=performance.now();
    const loader=new THREE.TextureLoader(), resources: THREE.Texture[]=[];
    const material=(map: THREE.Texture|null)=>new THREE.ShaderMaterial({
      uniforms:{map:{value:map},white:{value:0},alpha:{value:1},shade:{value:1},corner:{value:.055},ratio:{value:1.7},hover:{value:0},raw:{value:0},clipActive:{value:0},clipRect:{value:new THREE.Vector4()},viewport:{value:new THREE.Vector2(1,1)},bootFill:{value:1}},
      vertexShader:'varying vec2 vUv; varying float vDepth; varying vec3 vSurface; void main(){vUv=uv;vDepth=position.z;vSurface=(modelViewMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*vec4(vSurface,1.);}',
      fragmentShader:`uniform sampler2D map; uniform float white,alpha,shade,corner,ratio,hover,raw,clipActive; uniform vec4 clipRect; uniform vec2 viewport; uniform float bootFill; varying vec2 vUv; varying float vDepth; varying vec3 vSurface;
        void main(){if(vUv.x>bootFill)discard;vec2 screen=gl_FragCoord.xy/viewport;if(clipActive>.5&&(screen.x<clipRect.x||screen.y<clipRect.y||screen.x>clipRect.z||screen.y>clipRect.w))discard;vec2 q=abs(vUv-.5)*vec2(ratio,1.)-vec2(ratio*.5-corner,.5-corner);float d=length(max(q,0.))+min(max(q.x,q.y),0.)-corner;if(d>0.)discard;
        vec4 col=texture2D(map,vUv);float shadow=1.-shade*(.08+.25*clamp(-vDepth/12.+.35,0.,1.));vec3 c=col.rgb*shadow;
        vec3 n=normalize(cross(dFdx(vSurface),dFdy(vSurface)));if(n.z<0.)n=-n;
        vec3 viewDir=normalize(-vSurface),lightDir=normalize(vec3(-.22,.8,1.));
        float sheen=pow(max(dot(n,normalize(viewDir+lightDir)),0.),38.);
        float upper=smoothstep(.05,.95,vUv.y);
        c+=vec3(.11)*sheen*(.35+.65*upper)*shade*(1.-raw);
        c=mix(c,vec3(1.),white);gl_FragColor=vec4(c,alpha*col.a);
        #include <colorspace_fragment>
        }`,transparent:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false,
    });
    const cards=artworks.map((art,index)=>{
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1,40,24),material(null));mesh.frustumCulled=false;mesh.userData.index=index;scene.add(mesh);
      const raw=loader.load(art.image,async t=>{
        await document.fonts.load('400 42px GallerySans');
        if(disposed){t.dispose();return;}t.colorSpace=THREE.SRGBColorSpace;
        const canvas=document.createElement('canvas');canvas.width=1700;canvas.height=1000;
        const ctx=canvas.getContext('2d')!;const img=t.image as HTMLImageElement;
        const paint=()=>{ctx.clearRect(0,0,1700,1000);const factor=Math.max(1700/img.width,1000/img.height),w=img.width*factor,h=img.height*factor;ctx.drawImage(img,(1700-w)/2,(1000-h)/2,w,h);
          const gradient=ctx.createLinearGradient(0,500,0,1000);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,'rgba(0,0,0,.65)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1700,1000);
          ctx.textAlign='left';ctx.font=`400 ${width<650?70:42}px GallerySans`;ctx.fillStyle='#fff';ctx.fillText(art.title,48,944);
          const radius=width<650?52:30;ctx.fillStyle='#000';ctx.beginPath();ctx.arc(1628,930,radius,0,Math.PI*2);ctx.fill();ctx.font=`400 ${width<650?40:25}px Arial`;ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText('↗',1628,942);
        };paint();
        const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();resources.push(tex);
        mesh.material.uniforms.map.value=tex;mesh.userData.raw=t;mesh.userData.paint=()=>{paint();tex.needsUpdate=true;};loaded++;props.current.onProgress?.(loaded/artworks.length);if(loaded===artworks.length)props.current.onReady();
      },undefined,()=>{loaded++;props.current.onProgress?.(loaded/artworks.length);if(loaded===artworks.length)props.current.onReady();});resources.push(raw);return mesh;
    });
    const flyer=new THREE.Mesh(new THREE.PlaneGeometry(1,1,40,24),material(null));flyer.visible=false;flyer.frustumCulled=false;flyer.renderOrder=5;flyer.material.uniforms.raw.value=1;flyer.material.uniforms.shade.value=0;scene.add(flyer);
    const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,300,48,24),new THREE.ShaderMaterial({
      uniforms:{cell:{value:4},opacity:{value:1},halfW:{value:1}},vertexShader:'uniform float halfW;varying vec3 w;void main(){w=(modelMatrix*vec4(position,1.)).xyz;float s=clamp(w.x/halfW,-1.,1.);w.z-=halfW*.12*s*(1.5-.5*s*s);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}',
      fragmentShader:`uniform float cell,opacity;varying vec3 w;void main(){vec2 uv=w.xz/cell;vec2 edge=abs(fract(uv-.5)-.5)/fwidth(uv);float line=1.-min(min(edge.x,edge.y),1.);float fade=1.-smoothstep(5.,100.,-w.z);gl_FragColor=vec4(vec3(.01),line*fade*opacity*.85);}`,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    }));ground.rotation.x=-Math.PI/2;ground.position.z=-90;ground.renderOrder=-1;scene.add(ground);
    const buttons=artworks.map((art,i)=>{const b=document.createElement('button');b.className='card-hit';b.setAttribute('aria-label',`Open ${art.title}`);b.textContent=art.title;b.onclick=e=>{if(e.detail===0)open(i);};el.appendChild(b);return b;});
    const ray=new THREE.Raycaster(),point=new THREE.Vector3();
    const bounds: Origin[]=artworks.map(()=>({left:0,top:0,width:0,height:0}));
    function resize(){const oldGap=gap;width=el.clientWidth;height=el.clientHeight;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();halfH=Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z;halfW=halfH*camera.aspect;const small=width<650,pxH=small?(width-40)/1.7:height*.435;motion.maxInputSpeed=(small?halfH*2:halfW*2)*2.5;cardH=pxH/height*halfH*2;cardW=cardH*1.7;gap=small?cardH+20/height*halfH*2:cardW+width/150/width*halfW*2;if(!initialized){motion.reset(gap);current=gap;initialized=true;}else{motion.reset(current/oldGap*gap);current=motion.position;}ground.position.y=-cardH/2-halfH*.06;ground.material.uniforms.cell.value=halfH*.22;ground.visible=!small;cards.forEach(m=>m.userData.paint?.());geometryDirty=true;pointerDirty=true;}
    const observer=new ResizeObserver(()=>{resize();post.resize(width,height,renderer);});observer.observe(el);resize();post.resize(width,height,renderer);
    function geometry(mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>,cx:number,h:number,flight:Flight|null,isHero=false){
      const positions=mesh.geometry.attributes.position,uvs=mesh.geometry.attributes.uv;
      const columns=mesh.geometry.parameters.widthSegments+1,rows=mesh.geometry.parameters.heightSegments+1;
      const small=width<650,f=flight?.progress??0;
      const amount=isHero?smooth(.12,1,f):f,dest=flight?(isHero?flight.hero:flight.panel):null;
      const flightBow=Math.sin(Math.PI*f)*halfH*.10;
      const surface:Float64Array=mesh.userData.surface??(mesh.userData.surface=new Float64Array(columns*4));
      for(let column=0;column<columns;column++){
        const x=cx+(column/(columns-1)-.5)*cardW,q=x/halfW*1.15-.2,g=Math.exp(-q*q);
        const derivative=(Math.PI*Math.cos(Math.PI*q)-2*q*Math.sin(Math.PI*q))*g;
        // Only the added motion response tapers at the edges. The resting
        // profile follows the measured reference projection without flattening.
        const edge=1-smooth(.55,1,Math.abs(x/halfW));
        const twist=.15*bendVelocity*smooth(.15,.65,Math.abs(x/halfW))*Math.sign(x)*edge;
        const angle=-.16*derivative/Math.PI+twist,lean=THREE.MathUtils.clamp(x/halfW,-1,1),k=column*4;
        // The ribbon shape is anchored in world space, independent of gesture speed.
        surface[k]=Math.sin(angle);surface[k+1]=Math.cos(angle);
        // Reference silhouette comes from depth projection, not a vertical wave.
        surface[k+2]=.03*x;
        surface[k+3]=(-halfW*.2*Math.sin(Math.PI*q)*g-halfW*.12*lean*(1.5-.5*lean*lean))*(1+.15*Math.abs(bendVelocity)*edge);
      }
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for(let j=0;j<positions.count;j++){
        const u=uvs.getX(j),v=uvs.getY(j),k=(j%columns)*4,localY=(v-.5)*cardH;
        let x=small?(u-.5)*cardW:cx+(u-.5)*cardW;
        let y=small?cx+localY:localY*surface[k+1]+surface[k+2];
        let z=small?0:localY*surface[k]+surface[k+3]-h*.11*cardH*(1-(2*u-1)**2)*(1-(2*v-1)**2);
        if(dest){x+=( (dest.left+u*dest.width-width/2)/width*2*halfW-x)*amount;y+=((height/2-dest.top-(1-v)*dest.height)/height*2*halfH-y)*amount;z=z*(1-amount)+flightBow*(1-(2*v-1)**2);}
        const intro=props.current.state.intro??1;
        if(!isHero&&intro<1&&mesh.userData.index<3){
          const i=mesh.userData.index,step=i<3?Math.max(0,Math.min(1,(intro*1.6-i*.05)/1.5)):intro;
          const eased=step<.5?Math.pow(2,20*step-10)/2:(2-Math.pow(2,-20*step+10))/2;
          const bx=((i-1)*58+(u-.5)*50)/width*halfW*2,by=(v-.5)*5/height*halfH*2;
          x=THREE.MathUtils.lerp(bx,x,eased);y=THREE.MathUtils.lerp(by,y,eased);z*=eased;
        }
        positions.setXYZ(j,x,y,z);
        const row=Math.floor(j/columns),column=j%columns;
        if(!isHero&&((row===0||row===rows-1)&&column%4===0||column===0||column===columns-1)){
          point.set(x,y,z).project(camera);const px=(point.x+1)*width/2,py=(1-point.y)*height/2;
          minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
        }
      }
      positions.needsUpdate=true;
      mesh.geometry.boundingSphere??=new THREE.Sphere();mesh.geometry.boundingSphere.center.set(0,0,0);mesh.geometry.boundingSphere.radius=(halfW+halfH)*4;
      return {left:minX,top:minY,width:maxX-minX,height:maxY-minY};
    }
    function hit(){ray.setFromCamera(pointer,camera);return ray.intersectObjects(cards.filter(m=>m.visible))[0]?.object.userData.index??-1;}
    function open(i:number){if(props.current.state.mode!=='featured'||props.current.state.flight)return;motion.stop();dragging=false;motion.dragging=false;props.current.onOpen(i,bounds[i]);}
    function setPointer(e:PointerEvent){const r=el.getBoundingClientRect();pointer.set((e.clientX-r.left)/width*2-1,1-(e.clientY-r.top)/height*2);pointerDirty=true;}
    function down(e:PointerEvent){if(props.current.state.mode!=='featured'||props.current.state.flight||e.button!==0)return;setPointer(e);downIndex=hit();dragging=true;travel=0;lastX=e.clientX;lastY=e.clientY;motion.grab(e.timeStamp);el.setPointerCapture(e.pointerId);}
    function move(e:PointerEvent){setPointer(e);if(!dragging)return;const samples=e.getCoalescedEvents?.();for(const sample of samples?.length?samples:[e]){const delta=width<650?lastY-sample.clientY:lastX-sample.clientX;travel+=Math.hypot(lastX-sample.clientX,lastY-sample.clientY);const units=width<650?delta/height*halfH*2:delta/width*halfW*2;if(units)motion.dragBy(units,sample.timeStamp);lastX=sample.clientX;lastY=sample.clientY;}}
    function up(e:PointerEvent){if(!dragging)return;move(e);dragging=false;setPointer(e);motion.release(e.timeStamp,travel<6);if(travel<6){const i=hit();if(i>=0&&i===downIndex)open(i);}if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);}
    function cancel(){if(dragging)motion.release(performance.now(),true);dragging=false;}
    function wheel(e:WheelEvent){if(props.current.state.mode!=='featured'||props.current.state.flight||e.ctrlKey)return;e.preventDefault();const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY);const delta=horizontal?e.deltaX:e.deltaY;const factor=e.deltaMode===1?16:e.deltaMode===2?(horizontal?width:height):1;motion.wheelBy(delta*factor,width<650?halfH*2/height:halfW*2/width,e.timeStamp);}
    function key(e:KeyboardEvent){if(props.current.state.mode!=='featured'||props.current.state.flight)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();motion.nudge((e.key==='ArrowRight'?1:-1)*gap);}}
    el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',cancel);el.addEventListener('lostpointercapture',cancel);el.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);
    const track=(e:PointerEvent)=>post.pointer(e.clientX,e.clientY);window.addEventListener('pointermove',track);
    function render(now:number){
      const dt=Math.min((now-previous)/1000,.05);previous=now;const state=props.current.state;
      const oldPosition=current,oldSpeed=speed;
      if(!state.flight&&state.mode==='featured'){motion.step(dt);current=motion.position;speed=motion.speed;}else speed*=Math.exp(-12*dt);
      const oldBend=bendVelocity;
      const desiredBend=width<650?0:Math.tanh(speed*(width/(2*halfW))/900);
      bendVelocity+=(desiredBend-bendVelocity)*(1-Math.exp(-10*dt));
      const moved=Math.abs(bendVelocity-oldBend)>.00001||Math.abs(current-oldPosition)>.00001||Math.abs(speed-oldSpeed)>.0001;
      geometryDirty ||= moved||!!state.flight||hadFlight||lastIntro!==(state.intro??1);lastIntro=state.intro??1;
      hadFlight=!!state.flight;
      if(dragging||state.flight||state.mode!=='featured')hover=-1;
      else if(pointerDirty||geometryDirty)hover=hit();
      pointerDirty=false;
      const cursor=dragging?'grabbing':hover>=0?'pointer':'grab';if(el.style.cursor!==cursor)el.style.cursor=cursor;const cycle=gap*20;

      cards.forEach((mesh,i)=>{
        const cx=(width<650?-1:1)*(THREE.MathUtils.euclideanModulo(i*gap-current+cycle/2,cycle)-cycle/2),chosen=state.flight?.index===i?state.flight:null;
        mesh.visible=((state.intro??1)>0||i<3)&&(Math.abs(cx)<(width<650?halfH:halfW)*2.6||!!chosen)&&state.reveal<.999;
        const h=mesh.material.uniforms.hover.value;mesh.material.uniforms.hover.value=THREE.MathUtils.lerp(h,hover===i?1:0,1-Math.exp(-8*dt));
        if(mesh.visible){mesh.material.uniforms.bootFill.value=(state.intro??1)>0?1:Math.max(0,Math.min(1,(state.boot??1)*3-i));if(geometryDirty||Math.abs(h-mesh.material.uniforms.hover.value)>.00001)bounds[i]=geometry(mesh,cx,h,chosen);const bootStep=Math.max(0,Math.min(1,((state.intro??1)*1.6-i*.05)/1.5)),bootEase=i>=3?1:bootStep<=0?0:bootStep>=1?1:bootStep<.5?Math.pow(2,20*bootStep-10)/2:(2-Math.pow(2,-20*bootStep+10))/2;mesh.material.uniforms.corner.value=(state.intro??1)<1?THREE.MathUtils.lerp(.5,width<650?.075:.055,bootEase):chosen?THREE.MathUtils.lerp(width<650?.075:.055,width<650?15/chosen.panel.height:(width/75)/chosen.panel.height,chosen.progress):width<650?.075:.055;mesh.material.uniforms.ratio.value=(state.intro??1)<1?THREE.MathUtils.lerp(10,1.7,bootEase):chosen?THREE.MathUtils.lerp(1.7,chosen.panel.width/chosen.panel.height,chosen.progress):1.7;mesh.material.uniforms.white.value=chosen?smooth(.1,.75,chosen.progress):i<3?1-smooth(.08,.55,state.intro??1):0;mesh.material.uniforms.shade.value=chosen?1-chosen.progress:1;mesh.material.uniforms.alpha.value=(i<3?1:smooth(.65,1,state.intro??1))*(chosen?1:(1-state.reveal)*(1-(state.flight?.progress??0)));mesh.renderOrder=chosen?3:0;}
        const b=buttons[i],r=bounds[i];const css=`display:${mesh.visible&&(state.intro??1)>=1&&!state.flight&&state.mode==='featured'?'block':'none'};left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px`;if(mesh.userData.hitCss!==css){b.style.cssText=css;mesh.userData.hitCss=css;}const tabIndex=r.left+r.width/2>0&&r.left+r.width/2<width?0:-1;if(b.tabIndex!==tabIndex)b.tabIndex=tabIndex;
        if(chosen){flyer.visible=chosen.progress>.02;flyer.material.uniforms.map.value=mesh.userData.raw;flyer.material.uniforms.alpha.value=smooth(.02,.18,chosen.progress);flyer.material.uniforms.ratio.value=THREE.MathUtils.lerp(1.7,chosen.hero.width/Math.max(1,chosen.hero.height),chosen.progress);flyer.material.uniforms.corner.value=.055*(1-chosen.progress);flyer.material.uniforms.clipActive.value=chosen.progress>.99?1:0;flyer.material.uniforms.viewport.value.set(width*renderer.getPixelRatio(),height*renderer.getPixelRatio());const p=chosen.panel;flyer.material.uniforms.clipRect.value.set(p.left/width,1-(p.top+p.height)/height,(p.left+p.width)/width,1-p.top/height);geometry(flyer,cx,0,chosen,true);}
      });geometryDirty=false;if(!state.flight)flyer.visible=false;ground.material.uniforms.halfW.value=halfW;ground.material.uniforms.opacity.value=(state.intro??1)*(1-state.reveal)*(1-(state.flight?.progress??0));post.render(renderer,scene,camera,dt,state.hole);frame=requestAnimationFrame(render);
    }
    frame=requestAnimationFrame(render);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('keydown',key);window.removeEventListener('pointermove',track);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);el.removeEventListener('lostpointercapture',cancel);el.removeEventListener('wheel',wheel);buttons.forEach(b=>b.remove());cards.concat(flyer).forEach(m=>{m.geometry.dispose();m.material.dispose();});ground.geometry.dispose();ground.material.dispose();resources.forEach(t=>t.dispose());post.dispose();renderer.dispose();renderer.domElement.remove();};
  },[]);
  return <div ref={host} className="gallery" aria-label="Drag to explore the Nailong collection"/>;
}

