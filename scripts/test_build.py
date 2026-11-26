from build import build
import io, zipfile
from datetime import date
zbuf=io.BytesIO()
with zipfile.ZipFile(zbuf,'w') as z:
    z.writestr('stops.txt','stop_id,stop_name\n110401,Stop A\n148602,Stop B\n')
    z.writestr('routes.txt','route_id,route_short_name\nr,152\nx,999\n')
    z.writestr('trips.txt','route_id,service_id,trip_id,trip_headsign\nr,s,t,End A\nr,s,u,End B\nr,holiday,v,Special\nx,s,w,Wrong line\n')
    z.writestr('calendar.txt','service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\ns,1,1,1,1,1,1,1,20261124,20261205\n')
    z.writestr('calendar_dates.txt','service_id,date,exception_type\ns,20261127,2\nholiday,20261127,1\n')
    z.writestr('stop_times.txt','trip_id,stop_id,departure_time,pickup_type\nt,110401,12:38:00,0\nt,110401,24:15:00,0\nu,148602,12:40:00,0\nu,148602,13:00:00,1\nv,110401,15:00:00,0\nw,110401,11:00:00,0\n')
with zipfile.ZipFile(zbuf) as z: data=build(z,date(2026,11,26))
a=data['stops']['wyjazd']['days']; b=data['stops']['powrot']['days']
assert [x['time'] for x in a['2026-11-26']]==['00:15','12:38']
assert [x['time'] for x in a['2026-11-27']]==['00:15','15:00']
assert [x['time'] for x in b['2026-11-26']]==['12:40']
assert b['2026-11-27']==[]
assert '2026-12-06' not in a
print('OK: stop and line filters, pickup restrictions, overnight, calendar exceptions, feed horizon')
