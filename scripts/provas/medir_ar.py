# Medição do ar (persistida em /home/user/scripts para não refazer a cada turno).
import re, sys, urllib.request, collections
BASE="https://plmuse.lovable.app"
def get(u): return urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}),timeout=60).read()
html=get(BASE+"/").decode("utf-8","ignore")
entry=sorted(set(re.findall(r'assets/(index-[A-Za-z0-9_-]+\.js)',html))); print("entry:",entry)
seen,q,total,falhas,cache=set(),list(entry),0,0,{}
while q:
    n=q.pop(0)
    if n in seen: continue
    seen.add(n)
    try: d=get(BASE+"/assets/"+n)
    except Exception: falhas+=1; continue
    total+=len(d); cache[n]=d.decode("utf-8","ignore")
    for m in re.findall(r'assets/([A-Za-z0-9_.-]+\.js)',cache[n]):
        if m not in seen: q.append(m)
print(f"chunks: {len(seen)} bytes: {total} falhas: {falhas}")
c=collections.Counter()
for t in cache.values():
    for k in sys.argv[1:]: c[k]+=t.count(k)
print(dict(c))
