// Generator poziomów Block Out: node tools/blockout_levels.js > /tmp/levels.txt
// Losuje plansze (stałe ziarno), sprawdza solverem z tools/blockout_core.js, że da się je przejść,
// i wybiera po kilka na świat od łatwych do trudnych. Wynik wklej do BO_LEVELS w index.html.
const C=require("./blockout_core.js");
let seed=20261106;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;},ri=(a,b)=>a+Math.floor(rnd()*(b-a+1)),pick=a=>a[Math.floor(rnd()*a.length)];
const SH={o:["00"],i2:["00","10"],i2v:["00","01"],i3:["00","10","20"],i3v:["00","01","02"],sq:["00","10","01","11"],
  la:["00","01","11"],lb:["00","10","01"],lc:["00","10","11"],ld:["10","01","11"],
  L4a:["00","01","02","12"],L4b:["10","11","12","02"],T4:["00","10","20","11"],T4v:["00","01","02","11"],S4:["10","20","01","11"],Z4v:["00","01","11","12"],i4:["00","10","20","30"],i4v:["00","01","02","03"]};
const WORLDS=[
  {n:10,w:[4,5],h:[5,5],col:[2,3],blk:[3,5],sh:["o","i2","i2v","sq","i3","i3v"],lk:0,ice:0,rep:[0,1],mv:0,cap:150000},
  {n:10,w:[5,5],h:[5,6],col:[3,4],blk:[5,7],sh:["o","i2","i2v","sq","i3","i3v","la","lb","lc","ld"],lk:0,ice:0,rep:[1,3],mv:.25,cap:150000},
  {n:10,w:[5,6],h:[6,6],col:[3,5],blk:[6,8],sh:["i2","i2v","sq","i3","i3v","la","lb","lc","ld","T4","L4a"],lk:.45,ice:0,rep:[1,6],mv:.3,cap:150000},
  {n:10,w:[6,6],h:[6,7],col:[4,5],blk:[7,9],sh:["o","i2","i2v","sq","i3","i3v","la","lb","lc","ld","T4","T4v","L4a","L4b","S4","Z4v"],lk:.25,ice:.2,rep:[2,7],mv:.3,cap:150000}];
// poziom budowany od końca: każdy nowy klocek „wjeżdża” drzwiami swojego koloru i odjeżdża w losowe miejsce,
// czasem już stojący klocek się przesuwa. Ruchy są odwracalne, więc odwrócona lista = rozwiązanie (par ≤ liczba kroków).
function gen(W){
  const w=ri(...W.w),h=ri(...W.h),nc=ri(...W.col),doors=[],used={T:[],B:[],L:[],R:[]};
  for(let c=0;c<nc;c++){for(let t=0;t<30;t++){const s=pick("TBLR"),len=(s==="T"||s==="B")?w:h,n=ri(1,Math.min(3,len)),p=ri(0,len-n);
    if(used[s].some(([a,b])=>p<=b+1&&p+n-1>=a-1)) continue;used[s].push([p,p+n-1]);doors.push({s,p,n,c});break;}}
  const L={w,h,doors,blocks:[]},st={pos:[],out:0},steps=[],nb=ri(...W.blk);
  const wander=(i,k)=>{for(let j=0;j<k;j++){const R=C.reach(L,st,i);if(R.length<2) return;st.pos[i]=pick(R);}};
  for(let t=0;t<300&&L.blocks.length<nb;t++){
    if(L.blocks.length>1&&rnd()<W.mv){const i=ri(0,L.blocks.length-1),from=st.pos[i].slice();wander(i,1);if(st.pos[i][0]!==from[0]||st.pos[i][1]!==from[1]) steps.push({i,kind:"mv",to:from});continue;}
    const d=pick(doors),hz=d.s==="T"||d.s==="B",sk=pick(W.sh),cells=SH[sk].map(q=>[+q[0],+q[1]]);
    const bw=Math.max(...cells.map(q=>q[0]))+1,bh=Math.max(...cells.map(q=>q[1]))+1;if((hz?bw:bh)>d.n) continue;
    let lk="";if(rnd()<W.lk) lk=hz?"v":"h";
    const b={c:d.c,sk,cells,x:0,y:0,lk,ice:0},i=L.blocks.length;
    // miejsce wjazdu: klocek przy brzegu, w obrębie drzwi
    const off=ri(0,d.n-(hz?bw:bh)),x=hz?d.p+off:(d.s==="L"?0:w-bw),y=hz?(d.s==="T"?0:h-bh):d.p+off;
    L.blocks.push(b);st.pos.push([x,y]);const g=C.occ(L,{pos:st.pos.slice(0,i),out:0});
    if(!cells.every(([cx,cy])=>g[(y+cy)*w+x+cx]<0)||!C.exitAt(L,st,i,x,y)){L.blocks.pop();st.pos.pop();continue;}
    wander(i,ri(1,3));steps.push({i,kind:"in",to:[x,y]});}
  if(L.blocks.length<W.blk[0]) return null;
  // ruchy w przód = odwrócone kroki; lód: ile klocków wyjechało, zanim ten ruszy pierwszy raz
  const fw=steps.slice().reverse();let outs=0;const first={};fw.forEach(m=>{if(!(m.i in first)) first[m.i]=outs;if(m.kind==="in") outs++;});
  L.blocks.forEach((b,i)=>{if(first[i]>0&&rnd()<W.ice) b.ice=ri(1,Math.min(3,first[i]));});
  L.blocks.forEach((b,i)=>{b.x=st.pos[i][0];b.y=st.pos[i][1];});
  return {s:`${w}x${h}|`+doors.map(d=>d.s+d.p+d.n+d.c).join(";")+"|"+L.blocks.map(b=>`${b.c}:${SH[b.sk].join(",")}:${b.x}${b.y}${b.lk||b.ice?":"+b.lk+(b.ice||""):""}`).join(";"),ub:fw.length,sol:fw.map(m=>[m.i,m.to[0],m.to[1],m.kind==="in"?1:0])};}
const out=[];
WORLDS.forEach((W,wi)=>{const cand=[];
  for(let t=0;t<8000&&cand.length<W.n*5;t++){const G=gen(W);if(!G) continue;const s=G.s,L=C.parse(s);
    // od razu wyjechać może najwyżej 2 klocki (w 1. świecie 3) – inaczej za łatwo
    const st=C.start(L),free=L.blocks.filter((b,i)=>C.reach(L,st,i).some(([x,y])=>C.exitAt(L,st,i,x,y))).length;if(free>(wi?2:3)||free<1) continue;
    if(wi===2&&!L.blocks.some(b=>b.lk)) continue;if(wi===3&&!L.blocks.some(b=>b.ice)) continue;
    const rep=G.ub-L.blocks.length;if(rep<W.rep[0]||rep>W.rep[1]) continue;
    cand.push({s,ub:G.ub,sol:G.sol,d:rep*10+L.blocks.length*3-free*5});}
  cand.sort((a,b)=>a.d-b.d);const k=cand.length;
  for(let j=0;j<W.n;j++){const c=cand[Math.floor(j*(k-1)/Math.max(1,W.n-1))],r=C.solve(C.parse(c.s),null,W.cap);c.par=r?r.par:c.ub;c.ex=!!r;out.push(c);}
  console.error(`świat ${wi+1}: kandydatów ${k}`);});
require("fs").writeFileSync(process.env.BO_SOL||"/dev/null",JSON.stringify(out.map(c=>c.sol)));
console.log(out.map(c=>JSON.stringify(c.s+"|"+c.par)+",//"+(c.ex?"":"~")+c.par).join("\n"));
