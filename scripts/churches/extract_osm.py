"""Extract a reproducible Kenya directory from a Geofabrik OSM PBF.

Requires osmium and shapely. Output keeps source IDs and coordinates;
map listings are not verified Nuru members. No county/name inference.
"""
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
import osmium
from shapely import wkb
from shapely.geometry import Point

pbf, output = sys.argv[1:3]
factory = osmium.geom.WKBFactory()
counties = []
national_boundary = None
rows = []
skipped = 0
processor = (osmium.FileProcessor(pbf)
    .with_locations('sparse_file_array,/tmp/nuru-osm-locations')
    .with_areas(osmium.filter.TagFilter(('admin_level', '4'), ('admin_level', '2')))
    .with_filter(osmium.filter.TagFilter(('amenity', 'place_of_worship'), ('admin_level', '4'), ('admin_level', '2'))))
for obj in processor:
    tags = dict(obj.tags)
    if isinstance(obj, osmium.osm.Area):
        if tags.get('boundary') == 'administrative' and tags.get('admin_level') == '2' and tags.get('ISO3166-1') == 'KE':
            national_boundary = wkb.loads(factory.create_multipolygon(obj), hex=True)
        if tags.get('boundary') == 'administrative' and tags.get('admin_level') == '4' and tags.get('name'):
            try:
                counties.append((tags['name'].removesuffix(' County'), wkb.loads(factory.create_multipolygon(obj), hex=True)))
            except RuntimeError:
                pass
        continue
    if not isinstance(obj, (osmium.osm.Node, osmium.osm.Way)):
        continue
    if tags.get('amenity') != 'place_of_worship' or tags.get('religion') != 'christian':
        continue
    name = (tags.get('name:en') or tags.get('name') or '').strip()
    if not name:
        skipped += 1
        continue
    try:
        if isinstance(obj, osmium.osm.Node):
            lat, lon = obj.location.lat, obj.location.lon
            kind = 'node'
        else:
            geometry = wkb.loads(factory.create_linestring(obj), hex=True)
            lon, lat = geometry.centroid.x, geometry.centroid.y
            kind = 'way'
    except (RuntimeError, osmium.InvalidLocationError):
        skipped += 1
        continue
    rows.append({'name': name, 'latitude': lat, 'longitude': lon,
        'source_id': f'{kind}/{obj.id}', 'source_url': f'https://www.openstreetmap.org/{kind}/{obj.id}',
        'denomination': tags.get('denomination'),
        'city': tags.get('addr:city') or tags.get('addr:town') or tags.get('addr:village'),
        'website': tags.get('website') or tags.get('contact:website'),
        'county': None})

kept = []
duplicates = []
if national_boundary is None:
    raise RuntimeError('Kenya national boundary missing; refusing a country import')
county_aliases = {'Murang`a': "Murang'a", 'Trans Nzoia': 'Trans-Nzoia'}
for row in sorted(rows, key=lambda r: r['source_id']):
    point = Point(row['longitude'], row['latitude'])
    if national_boundary is not None and not national_boundary.covers(point):
        skipped += 1
        continue
    matches = [name for name, polygon in counties if polygon.covers(point)]
    row['county'] = county_aliases.get(matches[0], matches[0]) if len(matches) == 1 else None
    # Only collapse same-name map objects within 50m; preserve distant branches.
    normalized = ' '.join(row['name'].casefold().split())
    existing = next((r for r in kept if ' '.join(r['name'].casefold().split()) == normalized
        and math.hypot((r['latitude']-row['latitude'])*111320,
            (r['longitude']-row['longitude'])*111320*math.cos(math.radians(row['latitude']))) < 50), None)
    if existing:
        duplicates.append({'source_id': row['source_id'], 'kept': existing['source_id']})
    else:
        kept.append(row)
kept.sort(key=lambda r: ((r['county'] or 'ZZZ').casefold(), (r['city'] or 'ZZZ').casefold(), r['name'].casefold(), r['source_id']))
result = {'source': 'Geofabrik Kenya / OpenStreetMap contributors',
    'license': 'ODbL 1.0', 'extract_url': 'https://download.geofabrik.de/africa/kenya-latest.osm.pbf',
    'imported_at': datetime.now(timezone.utc).isoformat(),
    'coverage': 'Named Christian place_of_worship nodes and ways in the extract; incomplete national directory. Relations and untagged churches require additional review.',
    'county_boundaries': len(counties), 'national_boundary_confirmed': True,
    'skipped': skipped, 'duplicates': duplicates, 'churches': kept}
Path(output).write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'churches': len(kept), 'counties': len(counties), 'unknown_county': sum(r['county'] is None for r in kept), 'duplicates': len(duplicates), 'skipped': skipped}))
