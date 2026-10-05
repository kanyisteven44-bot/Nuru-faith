"""Produce idempotent SQL batches from the reviewed OSM extraction.

Usage: python scripts/churches/import_sql.py data/churches/kenya-osm.json START COUNT
Only inserts new listings. Existing church edits/verification remain untouched.
"""
import json
import sys
from urllib.parse import urlsplit

data = json.load(open(sys.argv[1]))
start, count = map(int, sys.argv[2:4])
def literal(value):
    return 'NULL' if value is None else "'"+str(value).replace("'", "''")+"'"
values = []
for row in data['churches'][start:start+count]:
    website = row['website']
    try:
        if website and (urlsplit(website).scheme not in ('http', 'https') or not urlsplit(website).hostname):
            website = None
    except ValueError:
        website = None
    description = 'Denomination not confirmed. Public map listing; not a verified Nuru Faith church partner. Map data © OpenStreetMap contributors (ODbL 1.0). Source: '+row['source_url']
    if not row['county']:
        description += ' County not confirmed.'
    # Source tags contradict some explicit church names. Keep them in the
    # attributed dataset for review; do not assert them as app denominations.
    denomination = None
    values.append('('+','.join(map(literal,[row['name'], 'ke-osm-'+row['source_id'].replace('/', '-'),
        denomination, 'Kenya', row['county'], row['city'], description, website]))+',false)')
if not values:
    raise SystemExit('No rows in requested batch')
print('INSERT INTO public.churches (name,slug,denomination,country,region,city,description,website,verified) VALUES\n'+',\n'.join(values)+'\nON CONFLICT (slug) DO NOTHING RETURNING slug;')
