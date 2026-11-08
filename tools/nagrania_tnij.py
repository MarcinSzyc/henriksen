# Cięcie długiego nagrania (jeden rozdział Przyrody z ElevenLabs) na lekcje po tytułach.
# Użycie: python natcut.py <katalog z in.wav (16 kHz) i words.json z Whispera> '[["id","Tytuł lekcji"],…]' → cuts.json [[id,start,koniec]]
# Tytuł szukany po kolei (dopuszcza 1 złe słowo), cięcie w najcichszym miejscu tuż przed tytułem.
import json,sys,wave,re,unicodedata,difflib
import numpy as np
D,spec=sys.argv[1],json.loads(sys.argv[2])  # spec: [[id,title],...] w kolejności
W=json.load(open(D+"/words.json"))
norm=lambda s:re.sub(r"[^a-ząćęłńóśźż0-9]","",s.lower())
ws=[norm(x["w"]) for x in W]
w=wave.open(D+"/in.wav");sr=w.getframerate();a=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
starts=[];pos=0
for id,title in spec:
  tw=[norm(t) for t in title.split() if norm(t)];best=None;T="".join(tw);n=len(tw)
  # porównanie samych liter (Whisper czasem skleja albo rozdziela słowa: „i mierzę” → „imierze”)
  def sc(i):return max((difflib.SequenceMatcher(None,"".join(ws[i:i+k]),T).ratio() for k in (n-1,n,n+1) if k>0 and i+k<=len(ws)),default=0)
  for i in range(pos,len(ws)):
    if sc(i)>=.8:
      gb=lambda j:W[j]["s"]-(W[j-1]["e"] if j else 0)
      if i+1<len(ws) and sc(i+1)>sc(i) and gb(i+1)>gb(i): i+=1 # słowo z końca poprzedniego zdania doklejone do tytułu – zacznij od następnego
      gap=W[i]["s"]-(W[i-1]["e"] if i else 0)
      if i==0 or gap>0.25 or W[i-1]["w"].strip()[-1:] in ".?!": best=i;break
  if best is None: print("NIE ZNALAZŁEM",id,title);sys.exit(1)
  starts.append(best);pos=best+max(1,n-1)
cuts=[]
for k,i in enumerate(starts):
  if i==0: cuts.append(0.0);continue
  lo,hi=max(W[i-1]["e"]-.05,W[i]["s"]-.9),W[i]["s"]+.05;seg=a[int(lo*sr):int(hi*sr)]
  win=int(.02*sr);e=[float(np.mean(seg[j:j+win]**2)) for j in range(0,max(1,len(seg)-win),win)] if len(seg)>win else [0]
  cuts.append(lo+(int(np.argmin(e))*win+win/2)/sr if len(seg)>win else (lo+hi)/2)
cuts.append(len(a)/sr)
for k,(id,title) in enumerate(spec):
  s0,s1=cuts[k],cuts[k+1];print(f"{id:12s} {s0:7.2f}–{s1:7.2f} ({s1-s0:5.1f}s) | {' '.join(x['w'].strip() for x in W[starts[k]:starts[k]+6])}")
json.dump([[id,cuts[k],cuts[k+1]] for k,(id,_) in enumerate(spec)],open(D+"/cuts.json","w"))
