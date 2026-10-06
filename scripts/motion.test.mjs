import assert from 'node:assert/strict';
import {GalleryMotion} from '../src/GalleryMotion.ts';
function replay(hz){
 const m=new GalleryMotion();m.grab(0);
 for(let i=1;i<=hz/2;i++){m.dragBy(1000/hz,i*1000/hz);m.step(1/hz);}
 assert.ok(m.target-m.position<30,`drag lag ${m.target-m.position}px`);
 m.release(500);for(let i=0;i<hz*2;i++)m.step(1/hz);
 const end=m.position;m.grab(2500);const grabbed=m.position;m.dragBy(-20,2516);m.step(1/hz);
 assert.ok(m.position<grabbed,'re-grab must reverse immediately');
 m.release(2516,true);const stopped=m.position;for(let i=0;i<hz;i++)m.step(1/hz);
 assert.equal(m.position,stopped,'cancel must stop');return end;
}
const a=replay(60),b=replay(144);assert.ok(Math.abs(a-b)<2,`refresh-rate drift: ${a-b}`);
const wheel=new GalleryMotion();wheel.wheelBy(120,1,1000);for(let i=0;i<60;i++)wheel.step(1/60);
assert.ok(wheel.position>295&&wheel.position<301,'wheel burst should settle to its intended distance');
wheel.wheelBy(-120,1,2000);const before=wheel.position;wheel.step(1/60);assert.ok(wheel.position<before,'wheel reversal');
const held=new GalleryMotion();held.grab(0);held.dragBy(100,100);for(let i=0;i<60;i++)held.step(1/60);held.release(1100);const heldAt=held.position;for(let i=0;i<60;i++)held.step(1/60);assert.ok(Math.abs(held.position-heldAt)<.01,'holding still must not launch stale inertia');
const flick=new GalleryMotion();flick.maxInputSpeed=2000;flick.grab(0);flick.dragBy(200,1);flick.step(1/60);flick.release(1);for(let i=0;i<180;i++)flick.step(1/60);assert.ok(flick.position<565,'compressed event timestamps must not fling across the collection');
console.log(JSON.stringify({pass:true,dragLagLimitPx:30,refreshRateDriftPx:Math.abs(a-b),wheelDistancePx:before}));
