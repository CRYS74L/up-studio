"""Split interface glyphs from existing core fonts without altering glyph metrics."""
import sys,json,re,hashlib
from pathlib import Path
sys.path.insert(0,str(Path('.local-runtime/font-tools').resolve()))
from fontTools import subset
from fontTools.ttLib import TTFont,woff2
compress=woff2.brotli.compress
woff2.brotli.compress=lambda data,**kwargs:compress(data,quality=6)
root=Path('public/fonts');css_path=Path('src/fonts.css');css=css_path.read_text(encoding='utf-8');manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
critical=set(range(0x20,0x250))|set(range(0x2000,0x2070))|set(range(0x3000,0x3040))|set(range(0xff00,0xffef))|set(range(0xfe10,0xfe70))
for source in Path('src').rglob('*'):
 if source.suffix in ('.ts','.tsx'):critical.update(ord(c) for c in source.read_text(encoding='utf-8-sig') if '\u3400'<=c<='\u9fff')
def ranges(values):
 groups=[]
 for cp in sorted(values):
  if groups and cp==groups[-1][1]+1:groups[-1][1]=cp
  else:groups.append([cp,cp])
 return ','.join('U+%X'%a+('-%X'%b if a!=b else '') for a,b in groups)
report=[]
for item in manifest:
 if item['family']=='UP Studio Cloud':continue
 css=re.sub(r"@font-face\{font-family:'"+re.escape(item['family'])+r"';src:url\('/fonts/"+re.escape(item['id'])+r"-critical-[a-f0-9]{12}\.woff2'\)[^\n]+\n?",'',css)
 pattern=r"@font-face\{font-family:'"+re.escape(item['family'])+r"';src:url\('/fonts/("+re.escape(item['id'])+r"-core-[a-f0-9]{12}\.woff2)'\)[^\n]+"
 match=re.search(pattern,css)
 if not match:raise RuntimeError('Core font rule missing: '+item['id'])
 core_name=match.group(1);font=TTFont(root/core_name,recalcTimestamp=False);cmap=font.getBestCmap();selected=critical&set(cmap);metrics={cp:font['hmtx'][cmap[cp]] for cp in selected}
 options=subset.Options();options.layout_features=['*'];options.recalc_timestamp=False;options.no_subset_tables+=['trak','meta'];options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*']
 sub=subset.Subsetter(options=options);sub.populate(unicodes=selected);sub.subset(font);font.flavor='woff2'
 temp=Path('.local-runtime')/(item['id']+'-critical.tmp');font.save(temp);data=temp.read_bytes();name=item['id']+'-critical-'+hashlib.sha256(data).hexdigest()[:12]+'.woff2';(root/name).write_bytes(data)
 check=TTFont(root/name);cc=check.getBestCmap();assert set(cc)==selected and all(check['hmtx'][cc[cp]]==metrics[cp] for cp in selected)
 def rule(file,points):return "@font-face{font-family:'%s';src:url('/fonts/%s') format('woff2');font-style:normal;font-weight:%s;font-display:block;unicode-range:%s;}"%(item['family'],file,item['weight'],ranges(points))
 css=css[:match.start()]+rule(core_name,set(cmap)-selected)+'\n'+rule(name,selected)+css[match.end():]
 report.append({'id':item['id'],'core':core_name,'critical':name,'bytes':len(data),'characters':len(selected),'metrics':'identical'})
css_path.write_text(css,encoding='utf-8');html_path=Path('index.html');html=html_path.read_text(encoding='utf-8')
for entry in report:
 html=html.replace('/fonts/'+entry['core'],'/fonts/'+entry['critical'])
 html=re.sub('/fonts/'+re.escape(entry['id'])+r'-critical-[a-f0-9]{12}\.woff2','/fonts/'+entry['critical'],html)
html_path.write_text(html,encoding='utf-8');print(json.dumps(report),flush=True)
