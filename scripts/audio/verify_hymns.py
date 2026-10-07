"""Verify selected Christian hymn recordings against the publisher's catalogue.
Only publish files that return an audio response and real MP3 bytes. No YouTube extraction.
"""
import json, re, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import datetime, timezone
CATALOGUE = 'https://incompetech.com/music/royalty-free/pieces.json'
LICENSE = 'https://incompetech.com/music/royalty-free/licenses/'
IDS = {'USUAN2100022','USUAN2100021','USUAN1100891','USUAN1100820','USUAN1100329','USUAN1100307','USUAN1100189','USUAN1100127','USUAN1100075'}
with urllib.request.urlopen(CATALOGUE, timeout=40) as response:
    catalogue = json.load(response)
def verify(row):
    url = 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/' + urllib.parse.quote(row['filename'])
    req = urllib.request.Request(url, headers={'Range':'bytes=0-16383'})
    try:
        with urllib.request.urlopen(req, timeout=40) as response:
            chunk = response.read(16384)
            content_type = response.headers.get('Content-Type','').split(';')[0]
            if response.status not in (200,206) or len(chunk) < 1024 or not (chunk.startswith(b'ID3') or any(chunk[i] == 255 and chunk[i+1] & 224 == 224 for i in range(min(len(chunk)-1,1024)))):
                raise ValueError('Not a playable MP3 response')
            if content_type not in ('audio/mpeg','audio/mp3','application/octet-stream'):
                raise ValueError('Unexpected content type '+content_type)
        h,m,s=map(int,row['length'].split(':'))
        return {'external_id':row['isrc'],'title':row['title'],'creator_name':'Kevin MacLeod',
            'audio_url':url,'duration_seconds':h*3600+m*60+s,'language_code':'zxx',
            'category':'hymns','thumbnail_url':'/photos/church-sunlight.jpg',
            'description':f"Instrumental Christian hymn. {row['title']} by Kevin MacLeod (incompetech.com). Licensed under Creative Commons Attribution 4.0: https://creativecommons.org/licenses/by/4.0/ . Unmodified recording. Publisher: https://incompetech.com/music/royalty-free/index.html?isrc={row['isrc']}",
            'publisher_page':'https://incompetech.com/music/royalty-free/index.html?isrc='+row['isrc'],
            'license_url':'https://creativecommons.org/licenses/by/4.0/',
            'verified_at':datetime.now(timezone.utc).isoformat(),'http_content_type':content_type}
    except Exception as error:
        print('Skipped',row['title'],str(error),flush=True)
        return None
with ThreadPoolExecutor(max_workers=4) as pool:
    verified=[row for row in pool.map(verify,[r for r in catalogue if r['isrc'] in IDS]) if row]
Path('data/audio/licensed-hymns.json').write_text(json.dumps({'catalogue_url':CATALOGUE,'license_source':LICENSE,'tracks':verified},ensure_ascii=False,indent=2)+'\n')
print('Verified audio hymns',len(verified),flush=True)
