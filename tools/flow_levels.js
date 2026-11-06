// Poziomy Flow (połącz kropki): node tools/flow_levels.js > /tmp/flow.txt
// Planszę dzieli się losowo na ścieżki (każda ≥ 3 pola, bez dotykania samej siebie bokiem), więc rozwiązanie istnieje z budowy.
// Zapis poziomu: "n|ścieżka;ścieżka;…" – ścieżka to kolejne pola (znak z FL_ABC = numer pola r*n+c), kropki = pierwsze i ostatnie pole.
const ABC="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-";
let seed=20261106;const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;},shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function gen(n,minP,maxP){
  const N=n*n,g=new Int16Array(N).fill(-1),P=[],nb=k=>{const r=Math.floor(k/n),c=k%n,o=[];if(r) o.push(k-n);if(r<n-1) o.push(k+n);if(c) o.push(k-1);if(c<n-1) o.push(k+1);return o;};
  const free=k=>nb(k).filter(x=>g[x]<0).length;
  // ścieżka nie może dotykać samej siebie bokiem (poza sąsiadem w ścieżce) – inaczej dałoby się ją skrócić
  const okStep=(p,x)=>nb(x).every(y=>g[y]!==p.id||y===p.c[p.c.length-1]);
  for(const s of shuf([...Array(N).keys()])){if(g[s]>=0) continue;const p={id:P.length,c:[s]};g[s]=p.id;P.push(p);
    const want=3+Math.floor(rnd()*(n+2));
    while(p.c.length<want){const e=p.c[p.c.length-1],opts=nb(e).filter(x=>g[x]<0&&okStep(p,x));if(!opts.length) break;
      opts.sort((a,b)=>free(a)-free(b)+(rnd()-.5)*1.5);const x=opts[0];g[x]=p.id;p.c.push(x);}}
  // za krótkie ścieżki: dołącz do końca sąsiedniej ścieżki
  for(let pass=0;pass<6;pass++) for(const p of P){if(!p.c.length||p.c.length>=3) continue;
    let done=false;for(const end of [p.c[0],p.c[p.c.length-1]]){for(const y of nb(end)){const q=P[g[y]];if(q===p||!q.c.length) continue;
      const qe=q.c[0]===y?0:q.c[q.c.length-1]===y?1:-1;if(qe<0) continue;
      const pc=end===p.c[0]?p.c.slice().reverse():p.c.slice(); // pc kończy się na end
      const merged=qe===1?q.c.concat(pc.slice().reverse()):pc.concat(q.c);
      // sprawdź dotykanie siebie
      const set=new Map(merged.map((k,i)=>[k,i]));if(merged.some((k,i)=>nb(k).some(y2=>set.has(y2)&&Math.abs(set.get(y2)-i)>1))) continue;
      q.c=merged;merged.forEach(k=>g[k]=q.id);p.c=[];done=true;break;}if(done) break;}}
  const paths=P.filter(p=>p.c.length);if(paths.some(p=>p.c.length<3)) return null;if(paths.length<minP||paths.length>maxP) return null;
  // kropki nie mogą stać obok siebie w tej samej parze (za łatwo)
  if(paths.some(p=>nb(p.c[0]).includes(p.c[p.c.length-1]))) return null;
  return `${n}|`+paths.map(p=>p.c.map(k=>ABC[k]).join("")).join(";");}
const W=[{n:5,p:[4,5]},{n:6,p:[5,6]},{n:7,p:[6,8]},{n:8,p:[7,11]}],out=[];
W.forEach((w,wi)=>{const seen=new Set();let got=0;for(let t=0;t<600000&&got<10;t++){const s=gen(w.n,...w.p);if(!s||seen.has(s)) continue;seen.add(s);out.push(s);got++;}
  console.error(`świat ${wi+1} (${w.n}×${w.n}): ${got}`);});
console.log(out.map(s=>`  "${s}",`).join("\n"));
