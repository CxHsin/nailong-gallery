// Piecewise cubic timing for the reference's one-second sheet transition.
const segments = [[0,0,.094,.026,.124,.127,.157,.29],[.157,.29,.197,.486,.254,.8,.348,.884],[.348,.884,.42,.949,.374,1,1,1]];
const cubic=(t:number,a:number,b:number,c:number,d:number)=>{const s=1-t;return s*s*s*a+3*s*s*t*b+3*s*t*t*c+t*t*t*d;};
export function sheetEase(p:number){if(p<=0)return 0;if(p>=1)return 1;const s=segments.find(s=>p<=s[6])!;let low=0,high=1;for(let i=0;i<20;i++){const t=(low+high)/2;if(cubic(t,s[0],s[2],s[4],s[6])<p)low=t;else high=t;}return cubic((low+high)/2,s[1],s[3],s[5],s[7]);}
