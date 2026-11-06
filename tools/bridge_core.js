/*BR-CORE*/
// Mosty: fizyka belek (XPBD, małe kroki). Oś y w górę, jednostka = kratka. Węzły to przeguby – sztywność daje tylko kształt (trójkąty).
// Poziom: {w (szerokość przepaści), ly/ry (wysokość lewego/prawego brzegu), an:[[x,y]] kotwy, pil:[[x,yTop]] filary skalne, mats, budget, car}
// Projekt: {n:[[x,y]] nowe węzły (indeksy po kotwach), b:[[a,b,mat]]}
const BR_CORE=(()=>{
  const MAT={road:{name:"Droga",cost:20,max:2.3,dens:1.2,str:900,c:"#495057"},wood:{name:"Drewno",cost:12,max:2.3,dens:.8,str:700,c:"#b5793a"},
    steel:{name:"Stal",cost:30,max:3.2,dens:1.5,str:1800,c:"#8aa0b8"},rope:{name:"Lina",cost:8,max:4.5,dens:.3,str:1000,c:"#c9a26b",rope:true}};
  // pojazd = części (nadwozie, lokomotywa, wagony), każda na dwóch kołach (przesunięcia od środka pojazdu); ciężar dzieli się na wszystkie koła
  const CARS={car:{name:"Auto",fall:"Auto wpadło do wody!",m:20,v:2.4,parts:[{k:"car",w:[-.7,.7]}]},
    truck:{name:"Ciężarówka",fall:"Ciężarówka wpadła do wody!",m:45,v:1.9,parts:[{k:"truck",w:[-1.1,.9]}]},
    train:{name:"Pociąg",fall:"Pociąg wpadł do wody!",m:60,v:2,parts:[{k:"loco",w:[1.3,2.7]},{k:"wagon",w:[-1.5,-.1]},{k:"wagon",w:[-4.3,-2.9]}]}};
  const G=9.8,WATER=-5;let SUB=30,IT=4,COMP=1e-6,OVER=8;
  const blen=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const cost=(L,d)=>{const P=L.an.concat(d.n);return Math.round(d.b.reduce((s,[a,b,m])=>s+MAT[m].cost*blen(P[a],P[b]),0));};
  // teren: lewy brzeg x<=0 na wysokości ly, prawy x>=w na ry, filary [x-0.5..x+0.5] do yTop
  const solid=(L,x,y)=>x<0&&y<L.ly||x>L.w&&y<L.ry||(L.pil||[]).some(([px,py])=>Math.abs(x-px)<.5&&y<py);
  function make(L,d){const P=L.an.concat(d.n),N=P.map((p,i)=>({x:p[0],y:p[1],px:p[0],py:p[1],vx:0,vy:0,m:0,fix:i<L.an.length,fx:0,fy:0}));
    const B=d.b.map(([a,b,mat])=>{const len=blen(P[a],P[b]),M=MAT[mat];N[a].m+=M.dens*len/2;N[b].m+=M.dens*len/2;return {a,b,mat,len,f:0,over:0,broken:false};});
    N.forEach(n=>{if(!n.m) n.m=.2;n.w=n.fix?0:1/n.m;});
    const C=CARS[L.car||"car"];
    const off=C.parts.flatMap(q=>q.w),wh=off.map(o=>({o,x:0,y:L.ly,vy:0,on:null,rot:0}));
    return {L,N,B,t:0,car:{x:-1.7-Math.max(...off),y:L.ly,run:false,dead:false,win:false,C,wh},res:null};}
  // podpora koła w punkcie x (najwyższa droga / teren nie wyżej niż y+0.35)
  function support(S,x,y){const L=S.L;let best=null;
    if(x<=0&&L.ly<=y+.35) best={y:L.ly};if(x>=L.w&&L.ry<=y+.35&&(!best||L.ry>best.y)) best={y:L.ry};
    for(const b of S.B){if(b.broken||b.mat!=="road") continue;const A=S.N[b.a],Bn=S.N[b.b],x0=Math.min(A.x,Bn.x),x1=Math.max(A.x,Bn.x);if(x<x0||x>x1||x1-x0<1e-6) continue;
      const t=(x-A.x)/(Bn.x-A.x),yy=A.y+(Bn.y-A.y)*t;if(yy<=y+.35&&(!best||yy>best.y)) best={y:yy,b,t};}
    return best;}
  function step(S,dt){const sub=SUB,h=dt/sub,{N,B,car}=S,C=car.C;
    if(S.res) return S.res;
    // samochód: rusza po 1 s (most najpierw się układa), koła szukają podpory
    S.t+=dt;if(S.t>1) car.run=true;
    if(car.run&&!car.dead) car.x+=C.v*dt;
    const W=C.m*G/car.wh.length;
    car.wh.forEach(w=>{const nx=car.x+w.o;w.rot+=(nx-w.x)/.27;w.x=nx;const s=support(S,w.x,w.y);
      if(s&&w.y<=s.y+.05){w.y=s.y;w.vy=0;w.on=s;}else{w.vy-=G*dt;w.y+=w.vy*dt;const s2=support(S,w.x,w.y+.3);if(s2&&w.y<s2.y){w.y=s2.y;w.vy=0;w.on=s2;}else w.on=null;}});
    if(car.wh.some(w=>w.y<WATER+.5)){car.dead=true;S.res={ok:false,why:C.fall};}
    if(car.wh.every(w=>w.x>S.L.w+1.5)&&!car.dead){car.win=true;S.res={ok:true};}
    if(S.t>40&&!S.res) S.res={ok:false,why:C.name+" nie dojechał"+(C.name==="Pociąg"?"":"o")+"."};
    for(let s=0;s<sub;s++){
      N.forEach(n=>{n.fx=0;n.fy=0;});
      car.wh.forEach(w=>{if(w.on&&w.on.b){const b=w.on.b;N[b.a].fy-=W*(1-w.on.t);N[b.b].fy-=W*w.on.t;}});
      for(const n of N){if(n.fix) continue;n.vy+=(-G+n.fy/n.m)*h;n.vx+=n.fx/n.m*h;n.px=n.x;n.py=n.y;n.x+=n.vx*h;n.y+=n.vy*h;
        if(n.y<WATER-3){n.y=WATER-3;n.vy=0;}}
      B.forEach(b=>{b.lam=0;});
      for(let it=0;it<IT;it++) for(const b of B){if(b.broken) continue;const A=N[b.a],Bn=N[b.b],dx=A.x-Bn.x,dy=A.y-Bn.y,l=Math.hypot(dx,dy)||1e-9,c=l-b.len;
        const wsum=A.w+Bn.w;if(!wsum) continue;
        if(MAT[b.mat].rope&&c<0&&b.lam>=0) continue; // lina tylko ciągnie
        const al=COMP/(h*h),dl=(-c-al*b.lam)/(wsum+al),nx=dx/l,ny=dy/l;b.lam+=dl;
        A.x+=A.w*dl*nx;A.y+=A.w*dl*ny;Bn.x-=Bn.w*dl*nx;Bn.y-=Bn.w*dl*ny;}
      for(const b of B){if(b.broken) continue;b.f=-b.lam/(h*h);const str=MAT[b.mat].str;if(Math.abs(b.f)>str){if(++b.over>OVER) b.broken=true;}else b.over=0;}
      for(const n of N){if(n.fix) continue;n.vx=(n.x-n.px)/h*.9995;n.vy=(n.y-n.py)/h*.9995;}}
    return S.res;}
  // symulacja bez rysowania (testy, sprawdzanie poziomów)
  function run(L,d,T=30){const S=make(L,d);for(let t=0;t<T&&!S.res;t+=1/60) step(S,1/60);return {res:S.res||{ok:false,why:"czas"},S};}
  return {cfg:o=>{if(o.SUB) SUB=o.SUB;if(o.IT) IT=o.IT;if(o.COMP) COMP=o.COMP;if(o.OVER) OVER=o.OVER;},MAT,CARS,WATER,blen,cost,solid,make,step,support,run};
})();
/*BR-END*/
if(typeof module!=="undefined") module.exports=BR_CORE;
