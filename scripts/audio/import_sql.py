"""Generate idempotent catalogue inserts from HTTP-verified, licensed audio metadata."""
import json
from pathlib import Path
tracks=json.loads(Path('data/audio/licensed-hymns.json').read_text())['tracks']
def literal(v):return 'NULL' if v is None else "'"+str(v).replace("'","''")+"'"
columns=['source','external_id','title','description','thumbnail_url','media_type','category','creator_name','audio_url','duration_seconds','language_code']
rows=[]
for t in tracks:
    row={'source':'nuru_audio','external_id':'incompetech:'+t['external_id'],'media_type':'music',**t}
    row['external_id']='incompetech:'+t['external_id']
    rows.append('('+','.join(literal(row.get(c)) for c in columns)+',true,false,true,now())')
print('INSERT INTO public.media_items ('+','.join(columns)+',is_approved,can_download,is_featured,published_at) VALUES\n'+',\n'.join(rows)+'\nON CONFLICT (source,external_id) DO NOTHING RETURNING title;')
