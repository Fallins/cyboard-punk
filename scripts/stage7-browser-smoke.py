#!/usr/bin/env python3
import json, math, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4173'
ENGINE = sys.argv[2].lower() if len(sys.argv) > 2 else 'chromium'
if ENGINE not in {'chromium', 'webkit'}: raise SystemExit(f'unsupported browser engine: {ENGINE}')
OUT = Path('stage7-browser-artifacts') / ENGINE
OUT.mkdir(parents=True, exist_ok=True)
M = {'baseUrl': BASE, 'engine': ENGINE, 'cases': {}, 'errors': []}

def progress(s): print(f'[{ENGINE}] {s}', flush=True)
def num(d, k): return float(d[k])
def dataset(p, selector): return p.locator(selector).evaluate('(e)=>Object.fromEntries(Object.entries(e.dataset))')

def page_open(browser, query, abort_front=False):
    dash = 'layout=dashboard' in query
    p = browser.new_page(viewport={'width':820,'height':598} if dash else {'width':302,'height':648}, device_scale_factor=1)
    p.set_default_timeout(8_000)
    p.add_init_script("""(()=>{const m=new Map();let n=1;requestAnimationFrame=(cb)=>{const i=n++,t=setTimeout(()=>{m.delete(i);cb(performance.now())},16);m.set(i,t);return i};cancelAnimationFrame=(i)=>{const t=m.get(i);if(t!==undefined){clearTimeout(t);m.delete(i)}}})()""")
    errors=[]
    p.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    p.on('console', lambda msg: errors.append(f'console.error: {msg.text}') if msg.type=='error' else None)
    if abort_front: p.route('**/front.webp', lambda r: r.abort())
    p.goto(f'{BASE}/stage7-runtime.html?{query}', wait_until='domcontentloaded', timeout=10_000)
    p.wait_for_selector('.stage7-capture-stage'); p.wait_for_timeout(180)
    return p, errors

def shot(p, name):
    path=OUT/f'{name}.png'; p.locator('.stage7-capture-stage').screenshot(path=str(path)); return path

def diff(a,b):
    A=Image.open(a).convert('RGB'); B=Image.open(b).convert('RGB'); D=ImageChops.difference(A,B)
    values=[max(px) for px in D.getdata()]; total=len(values)
    return {'changedPixelsOver8':sum(v>8 for v in values),'changedRatioOver8':sum(v>8 for v in values)/total,'maxChannelDelta':max(values)}

def crop(src,name,box):
    path=OUT/f'{name}.png'; Image.open(src).convert('RGB').crop(box).save(path); return path

def sheet(items,name,width=None):
    ims=[(label,Image.open(path).convert('RGB')) for label,path in items]; width=width or max(i.width for _,i in ims); h=max(i.height for _,i in ims)
    c=Image.new('RGB',(width*len(ims),h+22),(16,18,24)); d=ImageDraw.Draw(c)
    for idx,(label,im) in enumerate(ims):
        if im.width!=width: im=im.resize((width,round(im.height*width/im.width)))
        x=idx*width; c.paste(im,(x,22)); d.text((x+4,4),label,fill=(235,239,247))
    path=OUT/f'{name}.png'; c.save(path); return path

def contamination(blank,ref,candidate,dilate):
    B=Image.open(blank).convert('RGB'); R=Image.open(ref).convert('RGB'); C=Image.open(candidate).convert('RGB')
    allowed=ImageChops.difference(B,R).convert('L').point(lambda v:255 if v>8 else 0)
    if dilate: allowed=allowed.filter(ImageFilter.MaxFilter(dilate*2+1))
    changed=ImageChops.difference(B,C).convert('L').point(lambda v:255 if v>8 else 0)
    outside=ImageChops.multiply(changed,ImageChops.invert(allowed)); vals=list(outside.getdata())
    return {'outsideAllowedPixels':sum(v>0 for v in vals),'bbox':list(outside.getbbox()) if outside.getbbox() else None,'dilationPx':dilate}

def alpha_structure(p):
    r=p.locator('.nyx-stage7-experimental__svg').evaluate("""(svg)=>{const bad=[];for(const im of svg.querySelectorAll('image')){let n=im.parentElement,ok=false;while(n&&n!==svg){if((n.getAttribute('clip-path')||'').includes('nyx-s7-sil')){ok=true;break}n=n.parentElement}if(!ok)bad.push(im.outerHTML.slice(0,100))}const black=[...svg.querySelectorAll('mask rect[fill="black"]')].map(n=>n.outerHTML);const rects=[...svg.querySelectorAll('clipPath')].filter(n=>n.id!=='nyx-s7-blink-progress').flatMap(n=>[...n.querySelectorAll('rect')].map(r=>n.id+':'+r.outerHTML));return{imageCount:svg.querySelectorAll('image').length,unguarded:bad,blackCleanupRects:black,rectPartClips:rects}}""")
    assert not r['unguarded'] and not r['blackCleanupRects'] and not r['rectPartClips'], r
    return r

with sync_playwright() as pw:
    browser=(pw.chromium if ENGINE=='chromium' else pw.webkit).launch(headless=True)

    progress('blank/reference/neutral')
    p,e=page_open(browser,'blank=1'); blank=shot(p,'blank-capture-background'); M['errors']+=e; p.close()
    p,e=page_open(browser,'reference=1'); ref=shot(p,'reference-neutral'); M['errors']+=e; p.close()
    p,e=page_open(browser,'state=idle&attention=center&reduced=1&capture=neutral'); p.wait_for_selector('.nyx-stage7-experimental')
    st=dataset(p,'.stage7-capture-stage'); rt=dataset(p,'.nyx-stage7-experimental'); neutral=shot(p,'01-neutral-full-body')
    assert st.get('nyxRendererTier')=='stage7-experimental' and st.get('nyx2dLifecycle')=='static',st
    assert abs(num(rt,'neckDeg'))<.001 and abs(num(rt,'torsoDeg'))<.001,rt
    nd=diff(ref,neutral); nc=contamination(blank,ref,neutral,2); structure=alpha_structure(p)
    assert nd['changedRatioOver8']<.03,nd; assert nc['outsideAllowedPixels']<40,nc
    M['cases']['neutral']={'stage':st,'runtime':rt,'pixelDiff':nd,'contamination':nc,'alphaStructure':structure}; M['errors']+=e; p.close()
    crop(neutral,'02-head-closeup',(104,0,220,158)); crop(neutral,'03-left-hand-closeup',(55,205,132,350))
    lc=crop(neutral,'04a-cape-left',(62,255,125,525)); rc=crop(neutral,'04b-cape-right',(178,255,241,525)); sheet([('cape L',lc),('cape R',rc)],'04-cape-left-right-closeup',63)
    crop(neutral,'05-feet-boots-closeup',(118,470,211,648))

    progress('dashboard framing')
    p,e=page_open(browser,'blank=1&layout=dashboard'); db=shot(p,'dashboard-blank'); M['errors']+=e; p.close()
    p,e=page_open(browser,'reference=1&layout=dashboard'); dr=shot(p,'reference-dashboard-neutral'); M['errors']+=e; p.close()
    p,e=page_open(browser,'state=idle&attention=center&reduced=1&capture=neutral&layout=dashboard'); p.wait_for_selector('.nyx-stage7-experimental')
    box=p.locator('.stage7-capture-stage').bounding_box(); rbox=p.locator('.nyx-stage7-experimental').bounding_box(); dp=shot(p,'06-dashboard-neutral')
    assert box and round(box['width'])==820 and round(box['height'])==598,box
    dd=diff(dr,dp); dc=contamination(db,dr,dp,2); assert dd['changedRatioOver8']<.03,dd; assert dc['outsideAllowedPixels']<80,dc
    M['cases']['dashboard']={'stageBox':box,'runtimeBox':rbox,'pixelDiff':dd,'contamination':dc}; M['errors']+=e; p.close()

    progress('blink contact sheet')
    bp={}
    for v in (0,25,50,75,100):
        p,e=page_open(browser,f'state=idle&attention=center&capture=blink-{v}'); p.wait_for_selector('.nyx-stage7-experimental'); r=dataset(p,'.nyx-stage7-experimental')
        assert math.isclose(num(r,'blink'),v/100,abs_tol=.001),r
        bp[v]=crop(shot(p,f'blink-{v:03d}-full'),f'blink-{v:03d}-face',(104,18,220,135)); M['errors']+=e; p.close()
    sheet([(f'{v}%',bp[v]) for v in (0,25,50,75,100,75,50,25,0)],'07-blink-contact-sheet',116)
    M['cases']['blink']={'sequence':[0,.25,.5,.75,1,.75,.5,.25,0]}

    progress('breathing matrix')
    paths={}; data={}
    for mode,key in [('breath-exhale','exhale'),('breath-mid-inhale','mid'),('breath-peak-inhale','peak')]:
        p,e=page_open(browser,f'state=idle&attention=center&capture={mode}'); p.wait_for_selector('.nyx-stage7-experimental'); data[key]=dataset(p,'.nyx-stage7-experimental'); paths[key]=shot(p,f'08-breath-{key}'); M['errors']+=e; p.close()
    assert num(data['exhale'],'chestRisePx')==0 and 0<num(data['mid'],'breath')<1 and math.isclose(num(data['peak'],'breath'),1,abs_tol=.001),data
    assert .8<=num(data['peak'],'chestRisePx')<=1.5 and 1.002<=num(data['peak'],'chestScaleX')<=1.006 and 1.003<=num(data['peak'],'chestScaleY')<=1.0081 and .3<=num(data['peak'],'shoulderRisePx')<=.8,data
    bd=diff(paths['exhale'],paths['peak']); assert bd['changedPixelsOver8']>20,bd
    D=ImageChops.difference(Image.open(paths['exhale']).convert('RGB'),Image.open(paths['peak']).convert('RGB')).point(lambda v:min(255,v*8)); D.save(OUT/'09-breath-exhale-vs-inhale-diff.png')
    sheet([('exhale',paths['exhale']),('mid inhale',paths['mid']),('peak inhale',paths['peak'])],'08-breath-contact-sheet',151); M['cases']['breathing']={'samples':data,'diff':bd}

    progress('acknowledgement matrix')
    ap={}; ad={}
    for mode,key in [('ack-start','start'),('ack-mid','mid'),('ack-peak','peak'),('ack-settle','settle')]:
        p,e=page_open(browser,f'state=idle&attention=center&capture={mode}'); p.wait_for_selector('.nyx-stage7-experimental'); ad[key]=dataset(p,'.nyx-stage7-experimental'); ap[key]=shot(p,f'10-ack-{key}'); alpha_structure(p); M['errors']+=e; p.close()
    assert abs(num(ad['start'],'shoulderDeg'))>abs(num(ad['start'],'elbowDeg'))>=abs(num(ad['start'],'wristDeg')),ad
    assert abs(num(ad['peak'],'shoulderDeg'))<=8.01 and abs(num(ad['peak'],'elbowDeg'))<=4.81 and abs(num(ad['peak'],'wristDeg'))<1,ad
    for ch in ('shoulderDeg','elbowDeg','wristDeg'): assert abs(num(ad['settle'],ch))<abs(num(ad['peak'],ch)),ad
    ac=contamination(blank,ref,ap['peak'],34); assert ac['outsideAllowedPixels']<120,ac
    sheet([('start',ap['start']),('mid',ap['mid']),('peak',ap['peak']),('settle',ap['settle'])],'10-acknowledgement-contact-sheet',151); M['cases']['acknowledgement']={'samples':ad,'contamination':ac}

    progress('hidden/resume lifecycle')
    p,e=page_open(browser,'state=processing&attention=cursor'); p.wait_for_selector('.nyx-stage7-experimental'); p.wait_for_timeout(1250)
    st=dataset(p,'.stage7-capture-stage'); rt=dataset(p,'.nyx-stage7-experimental'); before=num(rt,'neckDeg'); assert st.get('nyx2dLifecycle')=='animated' and .5<before<=2.22 and 0<num(rt,'gazePx')<=1.02,(st,rt)
    shot(p,'11-processing-cursor'); p.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))"); p.wait_for_timeout(350)
    hs=dataset(p,'.stage7-capture-stage'); hr=dataset(p,'.nyx-stage7-experimental'); assert hs.get('nyx2dLifecycle')=='suspended' and math.isclose(num(hr,'neckDeg'),before,abs_tol=.05),(hs,hr); shot(p,'12-hidden-suspended')
    p.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))"); p.wait_for_timeout(20)
    rs=dataset(p,'.stage7-capture-stage'); rr=dataset(p,'.nyx-stage7-experimental'); shot(p,'13-first-resume-frame'); assert rs.get('nyx2dLifecycle')=='animated' and abs(num(rr,'neckDeg')-before)<.2,(rs,rr)
    M['cases']['hiddenResume']={'hiddenStage':hs,'hiddenRuntime':hr,'resumedStage':rs,'resumedRuntime':rr}; M['errors']+=e; p.close()

    progress('production fallback')
    p,e=page_open(browser,'state=idle&attention=center',abort_front=True); p.wait_for_function("document.querySelector('.stage7-capture-stage')?.dataset.nyxRendererTier==='production-fallback'",timeout=8_000)
    fs=dataset(p,'.stage7-capture-stage'); assert fs.get('nyxExperimentalFailure'),fs; shot(p,'14-production-fallback'); M['cases']['fallback']={'stage':fs,'expectedAbortErrors':e}; p.close()
    browser.close()

if M['errors']: raise AssertionError(f'{ENGINE} runtime emitted errors: '+' | '.join(M['errors']))
M['artifactAssertions']={'requiredCaptureMatrixProduced':True,'allDynamicSourceImagesSilhouetteGuarded':True,'noBlackCleanupRectangles':True,'noRectangularPartClipsExceptBlinkProgress':True}
(OUT/'metrics.json').write_text(json.dumps(M,indent=2),encoding='utf-8'); progress('PASS'); print(json.dumps(M,indent=2),flush=True)
