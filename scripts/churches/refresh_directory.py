"""Extract named Kenyan churches and recorded areas from an OSM PBF.
Includes Christian worship sites, named church buildings, and church relations.
County placement uses geoBoundaries polygons; missing localities remain missing.
Usage: python refresh_directory.py EXTRACT.pbf COUNTIES.geojson OUTPUT.json
"""
import json,sys,math
from pathlib import Path
from datetime import datetime,timezone
import osmium
from shapely import wkb
from shapely.geometry import shape,Point
pbf,boundary_path,output=sys.argv[1:4]
aliases={'Trans Nzoia':'Trans-Nzoia','Tharaka':'Tharaka-Nithi'}
counties=[(aliases.get(f['properties']['shapeName'],f['properties']['shapeName']),shape(f['geometry'])) for f in json.load(open(boundary_path))['features']]
factory=osmium.geom.WKBFactory()
rows={};skipped=0
processor=(osmium.FileProcessor(pbf).with_locations('sparse_file_array,/tmp/nuru-refresh-locations')
 .with_areas(osmium.filter.TagFilter(('amenity','place_of_worship'),('building','church'),('building','chapel'),('building','cathedral')))
 .with_filter(osmium.filter.TagFilter(('amenity','place_of_worship'),('building','church'),('building','chapel'),('building','cathedral'))))
for obj in processor:
 t=dict(obj.tags)
 name=(t.get('name:en') or t.get('name') or '').strip()
 if not name or t.get('religion') not in (None,'christian'):continue
 if not (t.get('religion')=='christian' and t.get('amenity')=='place_of_worship' or t.get('building') in ('church','chapel','cathedral')):continue
 try:
  if isinstance(obj,osmium.osm.Area):
   point=wkb.loads(factory.create_multipolygon(obj),hex=True).representative_point()
   kind='way' if obj.from_way() else 'relation';id=obj.orig_id()
  elif isinstance(obj,osmium.osm.Node):point=Point(obj.location.lon,obj.location.lat);kind='node';id=obj.id
  elif isinstance(obj,osmium.osm.Way):point=wkb.loads(factory.create_linestring(obj),hex=True).centroid;kind='way';id=obj.id
  else:continue
 except (RuntimeError,osmium.InvalidLocationError):skipped+=1;continue
 matches=[n for n,polygon in counties if polygon.covers(point)]
 if len(matches)!=1:skipped+=1;continue
 source_id=f'{kind}/{id}'
 locality=t.get('addr:city') or t.get('addr:town') or t.get('addr:village') or t.get('addr:suburb') or t.get('addr:place')
 rows[source_id]={'name':name,'latitude':point.y,'longitude':point.x,'source_id':source_id,
 'source_url':f'https://www.openstreetmap.org/{source_id}','county':matches[0],'city':locality,
 'denomination':t.get('denomination'),'website':t.get('website') or t.get('contact:website')}
kept=[];duplicates=[]
for row in sorted(rows.values(),key=lambda r:r['source_id']):
 normalized=' '.join(row['name'].casefold().split())
 match=next((r for r in kept if ' '.join(r['name'].casefold().split())==normalized and math.hypot((r['latitude']-row['latitude'])*111320,(r['longitude']-row['longitude'])*111320*math.cos(math.radians(row['latitude'])))<50),None)
 if match:duplicates.append({'source_id':row['source_id'],'kept':match['source_id']})
 else:kept.append(row)
result={'source':'Geofabrik Kenya / OpenStreetMap contributors','license':'ODbL 1.0',
 'extract_url':'https://download.geofabrik.de/africa/kenya-latest.osm.pbf',
 'county_source':'https://www.geoboundaries.org/api/current/gbOpen/KEN/ADM1/',
 'imported_at':datetime.now(timezone.utc).isoformat(),
 'coverage':'Named Christian worship sites and named church/chapel/cathedral buildings including relations. Incomplete national coverage; map listings are not verified Nuru church partners.',
 'county_boundaries':len(counties),'national_boundary_confirmed':True,'skipped':skipped,'duplicates':duplicates,'churches':kept}
Path(output).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'churches':len(kept),'duplicates':len(duplicates),'skipped':skipped,'counties_with_listings':len({r['county'] for r in kept})}),flush=True)
