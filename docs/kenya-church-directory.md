# Kenya church directory

Source: Geofabrik's Kenya OpenStreetMap extract, https://download.geofabrik.de/africa/kenya.html.
Map data © OpenStreetMap contributors, ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/.
The derived dataset is distributed under ODbL 1.0. It is **not a complete list of all Kenyan churches**.

Import snapshot: 2,932 listings across 45 counties, 51 duplicate map features collapsed. 542 listings have a mapped town; the remaining towns are left blank. This extract has no qualifying listings in Mandera or Nandi; this does not mean those counties have no churches. Source extract contains OSM data up to 2026-10-01T20:22:06Z. All imported entries have `verified=false`.

Denomination quality: inspection found contradictory OSM tags, including AIC and Full Gospel names tagged Anglican. Imported app denominations are therefore **null until reviewed**. Original denomination tags are retained only in the attributed dataset; do not bulk promote them into the app. Church names and county containment are separate from denomination verification.

`data/churches/kenya-osm.json` preserves original map IDs, names, coordinates, source URLs and raw denomination tags. The extraction includes named nodes and ways explicitly tagged `amenity=place_of_worship` and `religion=christian`; relation-only and incompletely tagged churches are not included. Unnamed features are skipped, not assigned invented names. Same-name features within 50 metres are collapsed; distant branches remain separate. County comes from containment in OSM administrative level 4 boundaries, not proximity to a city. Missing towns/counties remain unknown. County boundaries and denominations still require church/community review.

Reproduce with Python packages `osmium` and `shapely`:

```sh
python scripts/churches/extract_osm.py kenya.osm.pbf data/churches/kenya-osm.json
python scripts/churches/import_sql.py data/churches/kenya-osm.json 0 100
```

Review extraction counts and duplicate report before importing. Run generated SQL in batches via an authorized database administration connection. Imports use source-derived slugs, insert only, and preserve edited existing listings. Never mark imported records `verified`; that badge remains a separate church verification process. Do not import private contact information.

The app uses existing `region` for county and `city` for mapped town; it orders county → town → denomination → name → ID. Explore searches county, town, denomination and name, with pagination; onboarding supports text search and incremental rendering. A church detail includes its OpenStreetMap link and attribution. This changes no admin roles, authentication requirements or RLS policies.
