"""Produce idempotent SQL batches from the reviewed OSM extraction.

Usage: python scripts/churches/import_sql.py data/churches/kenya-osm.json START COUNT
Only inserts new listings. Existing church edits/verification remain untouched.
"""
import json
import sys
from urllib.parse import urlsplit

data = json.load(open(sys.argv[1]))
start, count = map(int, sys.argv[2:4])
denominations = {'anglican': 'Anglican', 'catholic': 'Catholic', 'roman_catholic': 'Catholic',
    'presbyterian': 'Presbyterian', 'baptist': 'Baptist', 'pentecostal': 'Pentecostal',
    'methodist': 'Methodist', 'lutheran': 'Lutheran', 'seventh_day_adventist': 'Seventh-day Adventist',
    'seventh-day_adventist': 'Seventh-day Adventist', 'nondenominational': 'Non-denominational'}
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
    description = 'Public map listing; not a verified Nuru Faith church partner. Map data © OpenStreetMap contributors (ODbL 1.0). Source: '+row['source_url']
    if not row['county']:
        description += ' County not confirmed.'
    raw_denom = row['denomination']
    denomination = denominations.get(raw_denom, raw_denom.replace('_', ' ').title() if raw_denom else None)
    values.append('('+','.join(map(literal,[row['name'], 'ke-osm-'+row['source_id'].replace('/', '-'),
        denomination, 'Kenya', row['county'], row['city'], description, website]))+',false)')
if not values:
    raise SystemExit('No rows in requested batch')
print('INSERT INTO public.churches (name,slug,denomination,country,region,city,description,website,verified) VALUES\n'+',\n'.join(values)+'\nON CONFLICT (slug) DO NOTHING RETURNING slug;')
