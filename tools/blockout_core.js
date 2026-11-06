/*BO-CORE*/
// Block Out: plansza w×h, drzwi na brzegach {s:"T"|"B"|"L"|"R",p:początek,n:długość,c:kolor}, klocki {c,cells:[[x,y]],x,y,lk:""|"h"|"v",ice:n}.
// Ruch = przesunięcie jednego klocka w dowolne osiągalne miejsce (palcem także „za róg”), a jeśli stoi przy drzwiach swojego koloru – wyjazd.
// Lód: klocek stoi, dopóki nie wyjedzie tyle innych klocków (ice). Strzałka (lk) = tylko poziomo albo pionowo.
const BO_CORE=(()=>{
  const parse=s=>{const [wh,ds,bs]=s.split("|"),[w,h]=wh.split("x").map(Number);
    const doors=ds.split(";").map(d=>({s:d[0],p:+d[1],n:+d[2],c:+d[3]}));
    const blocks=bs.split(";").map(b=>{const [c,cl,xy,ex]=b.split(":"),cells=cl.split(",").map(q=>[+q[0],+q[1]]);
      return {c:+c,cells,x:+xy[0],y:+xy[1],lk:ex&&/[hv]/.test(ex)?ex.match(/[hv]/)[0]:"",ice:ex&&/\d/.test(ex)?+ex.match(/\d+/)[0]:0};});
    return {w,h,doors,blocks};};
  const start=L=>({pos:L.blocks.map(b=>[b.x,b.y]),out:0});
  const occ=(L,st)=>{const g=new Int8Array(L.w*L.h).fill(-1);
    st.pos.forEach((p,i)=>{if(!p) return;for(const [cx,cy] of L.blocks[i].cells) g[(p[1]+cy)*L.w+p[0]+cx]=i;});return g;};
  // g = zajętość wszystkich klocków; własne pola klocka i traktujemy jak wolne
  const fits=(L,g,b,x,y,i)=>b.cells.every(([cx,cy])=>{const X=x+cx,Y=y+cy;if(X<0||Y<0||X>=L.w||Y>=L.h) return false;const v=g[Y*L.w+X];return v<0||v===i;});
  const movable=(L,st,i)=>!!st.pos[i]&&L.blocks[i].ice<=st.out;
  // wszystkie miejsca, do których klocek dojedzie (krok po kratce, bez przenikania)
  function reach(L,st,i,g){g=g||occ(L,st);const b=L.blocks[i],[x0,y0]=st.pos[i],seen=new Set([x0+","+y0]),q=[[x0,y0]],out=[];
    if(!movable(L,st,i)) return [];
    const dirs=b.lk==="h"?[[1,0],[-1,0]]:b.lk==="v"?[[0,1],[0,-1]]:[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){const [x,y]=q.shift();out.push([x,y]);
      for(const [dx,dy] of dirs){const k=(x+dx)+","+(y+dy);if(seen.has(k)) continue;if(fits(L,g,b,x+dx,y+dy,i)){seen.add(k);q.push([x+dx,y+dy]);}}}
    return out;}
  // drzwi, którymi klocek stojący w (x,y) wyjedzie: kolor, szerokość i wolna droga do brzegu
  function exitAt(L,st,i,x,y,g){g=g||occ(L,st);const b=L.blocks[i];
    if(b.ice>st.out) return null;
    const xs=b.cells.map(c=>x+c[0]),ys=b.cells.map(c=>y+c[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    for(const d of L.doors){if(d.c!==b.c) continue;
      if(b.lk==="h"&&(d.s==="T"||d.s==="B")) continue;if(b.lk==="v"&&(d.s==="L"||d.s==="R")) continue;
      const hz=d.s==="T"||d.s==="B",a0=hz?x0:y0,a1=hz?x1:y1;if(a0<d.p||a1>d.p+d.n-1) continue;
      const clear=b.cells.every(([cx,cy])=>{let X=x+cx,Y=y+cy;const [dx,dy]={T:[0,-1],B:[0,1],L:[-1,0],R:[1,0]}[d.s];
        for(;;){X+=dx;Y+=dy;if(X<0||Y<0||X>=L.w||Y>=L.h) return true;const v=g[Y*L.w+X];if(v>=0&&v!==i) return false;}});
      if(clear) return d;}
    return null;}
  const key=st=>st.pos.map(p=>p?p[0]+"."+p[1]:"-").join("|");
  // najkrótsze rozwiązanie (BFS po ruchach); cap = limit stanów, null = brak albo za trudne
  function solve(L,st0,cap=60000){st0=st0||start(L);const seen=new Map([[key(st0),null]]),q=[st0];let n=0;
    while(q.length){const st=q.shift();
      if(st.pos.every(p=>!p)){const path=[];let k=key(st);for(let e=seen.get(k);e;e=seen.get(k)){path.unshift(e.m);k=e.k;}return {par:path.length,path};}
      const g=occ(L,st);
      for(let i=0;i<st.pos.length;i++){if(!movable(L,st,i)) continue;const R=reach(L,st,i,g);let ex=null;
        for(const [x,y] of R) if(exitAt(L,st,i,x,y,g)){ex=[x,y];break;}
        const nx=ex?[{x:ex[0],y:ex[1],out:true}]:R.filter(([x,y])=>x!==st.pos[i][0]||y!==st.pos[i][1]).map(([x,y])=>({x,y,out:false}));
        for(const m of nx){const pos=st.pos.slice();pos[i]=m.out?null:[m.x,m.y];const s2={pos,out:st.out+(m.out?1:0)},k2=key(s2);
          if(seen.has(k2)) continue;seen.set(k2,{k:key(st),m:{i,...m}});q.push(s2);if(++n>cap) return null;}}}
    return null;}
  return {parse,start,occ,reach,exitAt,solve,movable,key};
})();
/*BO-END*/
if(typeof module!=="undefined") module.exports=BO_CORE;
