"""Create an exact-glyph core webfont; uncommon characters retain the original face."""
import sys,json,hashlib,re,argparse
from pathlib import Path
sys.path.insert(0,str(Path('.local-runtime/font-tools').resolve()))
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.ttLib import woff2
compress=woff2.brotli.compress
def fast_compress(data, **kwargs):
 kwargs.setdefault('quality',6)
 return compress(data,**kwargs)
woff2.brotli.compress=fast_compress
parser=argparse.ArgumentParser();parser.add_argument('--source-dir',action='append',default=[]);args=parser.parse_args()
root=Path('public/fonts');manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8-sig'))
core=set(range(0x250))|set(range(0x2000,0x2070))|set(range(0x3000,0x3040))|set(range(0xff00,0xffef))|set(range(0xfe10,0xfe70))
for first in range(0xb0,0xf8):
 for second in range(0xa1,0xff):
  try: core.add(ord(bytes([first,second]).decode('gb2312')))
  except UnicodeError: pass
for p in Path('src').rglob('*'):
 if p.suffix in ('.ts','.tsx'): core.update(ord(c) for c in p.read_text(encoding='utf-8-sig') if 0x3400<=ord(c)<=0x9fff)
def ranges(values):
 groups=[]
 for c in sorted(values):
  if groups and c==groups[-1][1]+1: groups[-1][1]=c
  else: groups.append([c,c])
 return ','.join('U+%X'%a+('-%X'%b if a!=b else '') for a,b in groups)
css=[];preloads={};report=[]
for item in manifest:
 native=next((Path(d)/item['sourceFile'] for d in args.source_dir if (Path(d)/item['sourceFile']).is_file() and hashlib.sha256((Path(d)/item['sourceFile']).read_bytes()).hexdigest()==item['sourceSha256']),None)
 print(item['id']+' starting',flush=True)
 f=TTFont(native or root/item['file'],fontNumber=item.get('collectionIndex') or 0,recalcTimestamp=False);cmap=f.getBestCmap();selected=core&set(cmap);original={cp:f['hmtx'][cmap[cp]] for cp in selected}
 options=subset.Options();options.layout_features=['*'];options.recalc_timestamp=False;options.no_subset_tables+=['trak','meta']
 sub=subset.Subsetter(options=options);sub.populate(unicodes=selected);sub.subset(f);f.flavor='woff2'
 temp=root/(item['id']+'-core.tmp');f.save(temp);data=temp.read_bytes();name=item['id']+'-core-'+hashlib.sha256(data).hexdigest()[:12]+'.woff2';target=root/name;temp.replace(target)
 check=TTFont(target);cc=check.getBestCmap();assert all(check['hmtx'][cc[cp]]==original[cp] for cp in selected)
 for file,points in [(item['file'],set(cmap)-selected),(name,selected)]:
  css.append("@font-face{font-family:'%s';src:url('/fonts/%s') format('woff2');font-style:normal;font-weight:%s;font-display:block;unicode-range:%s;}"%(item['family'],file,item['weight'],ranges(points)))
 preloads[item['file']]=name;report.append({'face':item['id'],'original':item['bytes'],'core':len(data),'characters':len(selected),'metrics':'identical'})
Path('src/fonts.css').write_text('\n'.join(css)+'\n',encoding='utf-8')
p=Path('index.html');text=p.read_text(encoding='utf-8');
for old,new in preloads.items():
 text=text.replace('/fonts/'+old,'/fonts/'+new)
 prefix=old.rsplit('-',1)[0]
 text=re.sub(r'/fonts/'+re.escape(prefix)+r'-core-[a-f0-9]{12}\.woff2','/fonts/'+new,text)
p.write_text(text,encoding='utf-8');print(json.dumps(report))
