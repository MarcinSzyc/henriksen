// Poziomy Mostów z mostami wzorcowymi: node tools/bridge_levels.js – sprawdza fizyką, że wzorzec przejeżdża, a „naiwny” (fail) się łamie,
// i wypisuje BR_LEVELS do wklejenia w index.html (budżet = wzorzec × 1,6, 3★ ≤ koszt wzorca, 2★ ≤ × 1,25).
const C=require("./bridge_core.js");
const W=(w,top)=>{const n=[],b=[];for(let x=2;x<w;x+=2) n.push([x,0]);const A=2,deck=[0,...n.map((_,i)=>A+i),1];
  for(let i=0;i+1<deck.length;i++) b.push([deck[i],deck[i+1],"road"]);const t0=A+n.length;
  for(let x=1;x<w;x+=2) n.push([x,1]);
  for(let i=0;i<w/2;i++){const tp=t0+i;b.push([deck[i],tp,top],[tp,deck[i+1],top]);if(i) b.push([tp-1,tp,top]);}return {n,b};};
const LV=[
 {name:"Pierwszy most",w:2,ly:0,ry:0,an:[[0,0],[2,0]],mats:["road"],car:"car",
  tip:"Przeciągnij palcem od czerwonej kotwy do drugiej – powstanie droga. Potem ▶ Jedź!",
  ref:{n:[],b:[[0,1,"road"]]}},
 {name:"Trójkąt",w:4,ly:0,ry:0,an:[[0,0],[4,0]],mats:["road","wood"],car:"car",
  tip:"Dwie drogi z przegubem w środku się złożą. Dodaj drewniany trójkąt – trójkąta nie da się zgnieść bez łamania belki.",
  ref:{n:[[2,0],[2,1]],b:[[0,2,"road"],[2,1,"road"],[0,3,"wood"],[3,1,"wood"],[2,3,"wood"]]},fail:{n:[[2,0]],b:[[0,2,"road"],[2,1,"road"]]}},
 {name:"Podpora",w:4,ly:0,ry:0,an:[[0,0],[4,0],[2,-2]],pil:[[2,-2]],mats:["road","wood"],car:"car",
  tip:"Belka od dołu podpiera drogę jak noga stołu. Czerwona kotwa na skale też się liczy!",
  ref:{n:[[2,0]],b:[[0,3,"road"],[3,1,"road"],[2,3,"wood"]]},fail:{n:[[2,0]],b:[[0,3,"road"],[3,1,"road"]]}},
 {name:"Szersza przepaść",w:6,ly:0,ry:0,an:[[0,0],[6,0],[0,-1],[6,-1]],mats:["road","wood"],car:"car",
  tip:"Każdy węzeł drogi musi być częścią trójkąta przypiętego do skały.",
  ref:{n:[[2,0],[4,0]],b:[[0,4,"road"],[4,5,"road"],[5,1,"road"],[2,4,"wood"],[3,5,"wood"]]}},
 {name:"Filar",w:8,ly:0,ry:0,an:[[0,0],[8,0],[4,-1]],pil:[[4,-1]],mats:["road","wood"],car:"car",
  tip:"Skała na środku to darmowa podpora. Oprzyj na niej most.",
  ref:{n:[[2,0],[4,0],[6,0]],b:[[0,3,"road"],[3,4,"road"],[4,5,"road"],[5,1,"road"],[2,3,"wood"],[2,4,"wood"],[2,5,"wood"]]}},
 {name:"Kratownica",w:8,ly:0,ry:0,an:[[0,0],[8,0]],mats:["road","wood"],car:"car",
  tip:"Kratownica to rząd trójkątów nad drogą. Tak są zbudowane prawdziwe mosty kolejowe.",
  ref:W(8,"wood"),fail:{n:[[2,0],[4,0],[6,0]],b:[[0,2,"road"],[2,3,"road"],[3,4,"road"],[4,1,"road"]]}},
 {name:"Pod górkę",w:6,ly:0,ry:1,an:[[0,0],[6,1],[0,-1],[6,0]],mats:["road","wood"],car:"car",
  tip:"Drugi brzeg jest wyżej. Droga może iść pod górkę – byle nie za stromo.",
  ref:{n:[[2,0],[4,1]],b:[[0,4,"road"],[4,5,"road"],[5,1,"road"],[2,4,"wood"],[3,5,"wood"]]}},
 {name:"Ciężarówka",w:8,ly:0,ry:0,an:[[0,0],[8,0]],mats:["road","wood","steel"],car:"truck",
  tip:"Ciężarówka waży ponad dwa razy więcej niż auto. Stal jest droższa, ale dużo mocniejsza.",
  ref:W(8,"steel"),fail:W(8,"wood")},
 {name:"Długi most",w:10,ly:0,ry:0,an:[[0,0],[10,0],[5,-1]],pil:[[5,-1]],mats:["road","wood","steel"],car:"car",
  tip:"Stalowa belka może być dłuższa (do 3 kratek) – sięgnie dalej od filaru.",
  ref:{n:[[2,0],[4,0],[6,0],[8,0]],b:[[0,3,"road"],[3,4,"road"],[4,5,"road"],[5,6,"road"],[6,1,"road"],[2,4,"wood"],[2,5,"wood"],[2,3,"steel"],[2,6,"steel"]]}},
 {name:"Pociąg",w:8,ly:0,ry:0,an:[[0,0],[8,0],[4,-1]],pil:[[4,-1]],mats:["road","wood","steel"],car:"train",
  tip:"Pociąg jest długi – stoi na kilku przęsłach naraz. Ciężar rozkłada się na wszystkie koła.",
  ref:{n:[[2,0],[4,0],[6,0]],b:[[0,3,"road"],[3,4,"road"],[4,5,"road"],[5,1,"road"],[2,3,"wood"],[2,4,"wood"],[2,5,"wood"]]},fail:{n:[[2,0],[4,0],[6,0]],b:[[0,3,"road"],[3,4,"road"],[4,5,"road"],[5,1,"road"]]}},
 {name:"Wielki finał",w:10,ly:0,ry:0,an:[[0,0],[10,0]],mats:["road","wood","steel"],car:"truck",
  tip:"Najdłuższa przepaść i najcięższy ładunek. Użyj wszystkiego, czego się nauczyłeś!",
  ref:W(10,"steel"),fail:W(10,"wood")},
 {name:"Ekspres",w:10,ly:0,ry:0,an:[[0,0],[10,0]],mats:["road","wood","steel"],car:"train",
  tip:"Ostatnie wyzwanie: cały pociąg nad najdłuższą przepaścią. Kratownica z najmocniejszego materiału!",
  ref:W(10,"steel"),fail:W(10,"wood")},
];
let ok=true;const out=[];
LV.forEach((L,k)=>{const lenOk=L.ref.b.every(([a,b,m])=>{const P=L.an.concat(L.ref.n);return C.blen(P[a],P[b])<=C.MAT[m].max+1e-9;});
  const r=C.run(L,L.ref),c=C.cost(L,L.ref),f=L.fail?C.run(L,L.fail).res:null;
  console.error(`${k+1} ${L.name.padEnd(18)} wzorzec ${r.res.ok?"OK":"FAIL "+r.res.why} koszt ${c} długości ${lenOk?"ok":"ZA DŁUGIE"}${f?` naiwny ${f.ok?"PRZEJECHAŁ!":"pada"}`:""}`);
  if(!r.res.ok||!lenOk||f&&f.ok) ok=false;
  const {ref,fail,...rest}=L;out.push({...rest,budget:Math.ceil(c*1.6/10)*10,s3:c,s2:Math.round(c*1.25)});});
console.log(out.map(x=>"  "+JSON.stringify(x)+",").join("\n"));
if(!ok) process.exit(1);
