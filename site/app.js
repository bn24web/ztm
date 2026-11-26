'use strict';
const $=id=>document.getElementById(id);
const tz='Europe/Warsaw';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'});
const clockFormat=new Intl.DateTimeFormat('pl-PL',{timeZone:tz,hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const dateKey=d=>{const p=Object.fromEntries(dayFormat.formatToParts(d).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
const niceDate=d=>new Intl.DateTimeFormat('pl-PL',{timeZone:tz,weekday:'short',day:'numeric',month:'long'}).format(new Date(d+'T12:00:00Z'));
const VIEWS={
  wyjazd:{
    title:'Wyjazd · Krokwi → PKP Płudy',
    directionLabel:'Kierunek autobusu: Os. Derby',
    stopBadge:'Krokwi 02',
    route:['Krokwi 02','Os. Derby'],
    activeIndex:0
  },
  powrot:{
    title:'Powrót · PKP Płudy → Krokwi',
    directionLabel:'Kierunek autobusu: Tarchomin',
    stopBadge:'PKP Płudy 01',
    route:['PKP Płudy 01','Tarchomin'],
    activeIndex:0
  }
};
let data,stop,manualDay=null,lastSignature='',fetchError=false;
const viewKey=document.body.dataset.view||document.body.dataset.stop;
const view=VIEWS[viewKey]||{title:'Rozkład jazdy',directionLabel:'',stopBadge:'',route:[],activeIndex:-1};
function renderRoute(){
  const el=$('route-visual');
  if(!el) return;
  el.replaceChildren();
  const caption=document.createElement('div');
  caption.className='route-caption';
  caption.textContent='TRASA POGLĄDOWA';
  const track=document.createElement('div');
  track.className='route-track';
  view.route.forEach((name,index)=>{
    const point=document.createElement('span');
    point.className='route-point'+(index===view.activeIndex?' active':'');
    point.textContent=name;
    track.append(point);
    if(index<view.route.length-1){
      const arrow=document.createElement('span');
      arrow.className='route-arrow';
      arrow.textContent='→';
      track.append(arrow);
    }
  });
  el.append(caption,track);
}
function tick(){
  const now=new Date(), today=dateKey(now), sec=now.getTime()/1000;
  $('clock').textContent=clockFormat.format(now);
  if(!stop)return;
  const days=stop.days, keys=Object.keys(days).sort();
  const known=Object.hasOwn(days,today);
  const all=keys.flatMap(d=>days[d]);
  const upcoming=known?all.filter(x=>x.ts>=Math.floor(sec/60)*60):[];
  const next=upcoming[0];
  const nextDay=next?dateKey(new Date(next.ts*1000)):null;
  const selected=manualDay??((nextDay&&nextDay!==today)?nextDay:today);
  const age=(sec-Date.parse(data.downloaded_at)/1000)/3600;
  const warnings=[];
  if(!known)warnings.push('Brak danych na dzisiejszy dzień. Sprawdź oficjalny rozkład.');
  if(age>36)warnings.push('Dane starsze niż 36 godzin — sprawdź aktualność.');
  if(fetchError)warnings.push('Nie udało się odświeżyć danych.');
  $('status').textContent=warnings.join(' ');
  $('status').className=warnings.length?'warning':'';
  $('next-time').textContent=next?next.time:'—';
  if(next){const m=Math.max(0,Math.ceil((next.ts-sec)/60));$('countdown').textContent=(nextDay===today?'':niceDate(nextDay)+' · ')+(m===0?'Teraz':m>=60?`za ${Math.floor(m/60)} h ${m%60} min`:`za ${m} min`);}
  else $('countdown').textContent=known?'Brak dalszych kursów w dostępnych danych':'Brak aktualnych danych';
  $('following').textContent=upcoming.length>1?'Kolejne: '+upcoming.slice(1,4).map(x=>(dateKey(new Date(x.ts*1000))===today?'':niceDate(dateKey(new Date(x.ts*1000)))+' ')+x.time).join(' · '):'';
  $('direction').textContent=view.directionLabel;
  const signature=JSON.stringify([data.downloaded_at,selected,next?.ts,Math.floor(sec/60)]);
  if(signature===lastSignature)return;lastSignature=signature;
  const select=$('day');select.replaceChildren();for(const d of [...new Set([today,...keys])].sort()){const o=new Option(niceDate(d),d);select.add(o);}select.value=selected;
  const tbody=$('rows');tbody.replaceChildren();
  const groups=new Map();for(const x of days[selected]||[]){const [h,m]=x.time.split(':');if(!groups.has(h))groups.set(h,[]);groups.get(h).push(x);}
  for(const [h,departures] of groups){const row=document.createElement('tr');const hour=document.createElement('td');hour.textContent=h;const mins=document.createElement('td');for(const x of departures){const span=document.createElement('span');span.textContent=x.time.slice(3);span.className='minute'+(x===next?' soon':x.ts<Math.floor(sec/60)*60?' past':'');span.title=x.time+' '+(view.directionLabel||x.direction);if(x===next)span.setAttribute('aria-label',x.time+' – najbliższy odjazd');mins.append(span);}row.append(hour,mins);tbody.append(row);}
  if(!groups.size){const row=tbody.insertRow();const c=row.insertCell();c.colSpan=2;c.textContent=Object.hasOwn(days,selected)?'Brak kursów':'Brak danych na ten dzień';}
}
async function load(){try{const r=await fetch('../schedule.json',{cache:'no-store'});if(!r.ok)throw Error(r.status);const d=await r.json();const s=d.stops[document.body.dataset.stop];if(!s||!s.days)throw Error('Invalid data');data=d;stop=s;fetchError=false;$('stop').textContent=view.title;$('updated').textContent=new Date(d.downloaded_at).toLocaleString('pl-PL',{timeZone:tz});renderRoute();lastSignature='';tick();}catch(e){fetchError=true;if(!stop){$('stop').textContent=view.title;$('direction').textContent=view.directionLabel;renderRoute();$('countdown').textContent='Nie udało się pobrać rozkładu';$('status').textContent='Sprawdź GitHub Actions lub oficjalną stronę WTP.';}else tick();}}
$('day').addEventListener('change',e=>{manualDay=e.target.value;lastSignature='';tick();});$('today').addEventListener('click',()=>{manualDay=dateKey(new Date());lastSignature='';tick();});
load();setInterval(tick,1000);setInterval(load,300000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
