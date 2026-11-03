# Wybór zadań z bazy Lichess (CSV ze stdin) – instrukcja w chess/LICENSES.md
import sys,csv,json
# czyta CSV bazy zadań Lichess ze stdin, zbiera po N zadań na temat (mat w 1/2/3) w zakresie ocen
N=int(sys.argv[1]);out=sys.argv[2]
LIM={"mateIn1":(400,1100),"mateIn2":(500,1300),"mateIn3":(600,1500)}
got={k:[] for k in LIM}
r=csv.reader(sys.stdin)
next(r)
for row in r:
    try: pid,fen,moves,rating,rd,pop,plays,themes=row[:8]
    except ValueError: continue
    th=themes.split();rating=int(rating)
    for k,(lo,hi) in LIM.items():
        if k in th and lo<=rating<=hi and int(pop)>=85 and int(plays)>=300 and len(got[k])<N:
            got[k].append([pid,fen,moves,rating])
    if all(len(v)>=N for v in got.values()): break
json.dump(got,open(out,"w"),separators=(",",":"))
print({k:len(v) for k,v in got.items()})
