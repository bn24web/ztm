"""Build a compact static timetable from Warsaw GTFS (Python 3.11+)."""
import csv, io, json, sys, tempfile, shutil, urllib.request, zipfile
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone, time
from pathlib import Path
from zoneinfo import ZoneInfo

URL = 'https://mkuran.pl/gtfs/warsaw.zip'
TZ = ZoneInfo('Europe/Warsaw')
STOPS = {'wyjazd': '110401', 'powrot': '148602'}
ROOT = Path(__file__).resolve().parents[1]

def rows(z, name):
    if name not in z.namelist():
        return
    with z.open(name) as f, io.TextIOWrapper(f, encoding='utf-8-sig', newline='') as t:
        yield from csv.DictReader(t)

def parse_date(s):
    return datetime.strptime(s, '%Y%m%d').date()

def seconds(s):
    h,m,s = map(int, s.split(':'))
    return h*3600+m*60+s

def build(z, today):
    dates = [today+timedelta(days=i) for i in range(11)]
    # GTFS times may exceed 24h; include preceding service days.
    service_days = [today-timedelta(days=i) for i in (2,1)] + dates
    active = {d:set() for d in service_days}
    weekdays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
    for r in rows(z,'calendar.txt'):
        start,end = parse_date(r['start_date']),parse_date(r['end_date'])
        for d in service_days:
            if start <= d <= end and r[weekdays[d.weekday()]] == '1':
                active[d].add(r['service_id'])
    for r in rows(z,'calendar_dates.txt'):
        d = parse_date(r['date'])
        if d in active:
            if r['exception_type'] == '1': active[d].add(r['service_id'])
            elif r['exception_type'] == '2': active[d].discard(r['service_id'])
    if not active[today]: raise ValueError('GTFS has no service coverage for today')
    names = {r['stop_id']:r['stop_name'] for r in rows(z,'stops.txt') if r['stop_id'] in STOPS.values()}
    if set(names) != set(STOPS.values()): raise ValueError('Missing requested stop IDs')
    route_ids = {r['route_id'] for r in rows(z,'routes.txt') if r['route_short_name'].strip() == '152'}
    trips = {r['trip_id']:(r['service_id'],r.get('trip_headsign','')) for r in rows(z,'trips.txt') if r['route_id'] in route_ids}
    if not trips: raise ValueError('Line 152 missing')
    hits = defaultdict(list)
    for r in rows(z,'stop_times.txt'):
        if r['stop_id'] in names and r['trip_id'] in trips and r.get('pickup_type') != '1' and r.get('departure_time'):
            sid, headsign = trips[r['trip_id']]
            hits[r['stop_id']].append((sid,headsign,seconds(r['departure_time'])))
    result = {'line':'152','source':URL,'downloaded_at':datetime.now(timezone.utc).isoformat(),'timezone':str(TZ),'stops':{}}
    for key, stop in STOPS.items():
        if not hits[stop]: raise ValueError(f'No departures for stop {stop}')
        days = {d.isoformat():[] for d in dates if active[d]}
        for d in service_days:
            midnight = datetime.combine(d,time(12),TZ).timestamp()-43200
            for sid,headsign,sec in hits[stop]:
                if sid not in active[d]: continue
                stamp = int(midnight+sec)
                local = datetime.fromtimestamp(stamp,TZ)
                ds = local.date().isoformat()
                if ds in days:
                    days[ds].append({'ts':stamp,'time':local.strftime('%H:%M'),'direction':headsign})
        for ds, values in days.items():
            days[ds] = sorted({(x['ts'],x['direction']):x for x in values}.values(),key=lambda x:x['ts'])
        if not days.get(today.isoformat()): raise ValueError(f'No departures today for {stop}; refusing to publish incomplete feed')
        result['stops'][key]={'id':stop,'name':names[stop], 'days':days}
    return result

def main():
    with tempfile.TemporaryDirectory() as tmp:
        archive=Path(tmp)/'feed.zip'
        if len(sys.argv)>1: archive=Path(sys.argv[1])
        else:
            request=urllib.request.Request(URL,headers={'User-Agent':'ztm-timetable/1.0 (GitHub Pages daily build)'})
            with urllib.request.urlopen(request,timeout=120) as resp, archive.open('wb') as f: shutil.copyfileobj(resp,f)
        with zipfile.ZipFile(archive) as z: data=build(z,datetime.now(TZ).date())
        out=ROOT/'site'/'schedule.json'
        out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print('Created',out, 'stops:',[(k,v['name'],len(v['days'])) for k,v in data['stops'].items()])
if __name__=='__main__': main()
