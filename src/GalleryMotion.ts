/** Distances use world units, velocities use world units per second. */
export class GalleryMotion {
  position=0;
  target=0;
  speed=0;
  dragging=false;
  maxInputSpeed=Infinity;
  private coast=0;
  private inputSpeed=0;
  private lastInput=0;
  private wheelPending=0;
  private lastWheel=-Infinity;
  private lastDenseWheel=-Infinity;
  private wheelDirection=0;
  reset(position:number){this.position=this.target=position;this.coast=this.inputSpeed=this.speed=this.wheelPending=0;}
  grab(time:number){this.dragging=true;this.target=this.position;this.coast=this.inputSpeed=this.wheelPending=0;this.lastInput=time;}
  dragBy(distance:number,time:number){
    const dt=Math.max(.001,(time-this.lastInput)/1000);
    const velocity=Math.max(-this.maxInputSpeed,Math.min(this.maxInputSpeed,distance/dt));
    if(distance&&Math.sign(distance)!==Math.sign(this.inputSpeed)){this.inputSpeed=velocity;this.target=this.position;}
    else this.inputSpeed+=(velocity-this.inputSpeed)*(1-Math.exp(-24*dt));
    this.target+=distance;this.lastInput=time;
  }
  release(time:number,cancel=false){
    this.dragging=false;
    this.coast=cancel?0:this.inputSpeed*Math.exp(-Math.max(0,time-this.lastInput)/70);
    if(cancel)this.target=this.position;
    this.inputSpeed=0;
  }
  wheelBy(pixels:number,unitsPerPixel:number,time:number){
    const direction=Math.sign(pixels),interval=time-this.lastWheel;
    if(interval<30)this.lastDenseWheel=time;
    const stepped=Math.abs(pixels)>=40&&interval>=30&&time-this.lastDenseWheel>=500;
    if(this.coast||direction!==this.wheelDirection){this.target=this.position;this.wheelPending=0;}
    this.coast=0;this.wheelDirection=direction;this.lastWheel=time;
    const distance=pixels*unitsPerPixel*1.25;
    if(stepped)this.wheelPending+=distance*2;else this.target+=distance;
  }
  nudge(distance:number){this.coast=0;this.wheelPending=0;this.target+=distance;}
  stop(){this.target=this.position;this.coast=this.inputSpeed=this.wheelPending=this.speed=0;}
  step(dt:number){
    const before=this.position;
    if(this.dragging)this.position+=(this.target-this.position)*(1-Math.exp(-32*dt));
    else if(this.coast){
      const decay=Math.exp(-5.5*dt),distance=this.coast*(1-decay)/5.5;
      this.position+=distance;this.target+=distance;this.coast*=decay;
      this.position+=(this.target-this.position)*(1-Math.exp(-32*dt));
      if(Math.abs(this.coast)<.0001)this.coast=0;
    }else{
      const amount=this.wheelPending*(1-Math.exp(-14.907*dt));
      this.wheelPending-=amount;this.target+=amount;
      this.position+=(this.target-this.position)*(1-Math.exp(-14*dt));
    }
    this.speed+=((this.position-before)/Math.max(dt,.001)-this.speed)*(1-Math.exp(-12*dt));
  }
}
