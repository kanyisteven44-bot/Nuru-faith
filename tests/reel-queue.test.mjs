import assert from 'node:assert/strict';
import test from 'node:test';
import {reelContentKey,unseenReelQueue,nextReelId} from '../src/lib/reelQueue.ts';
const imported={id:'database-row',source_type:'youtube',external_id:'abcdefghijk'};
const fallback={id:'yt:abcdefghijk',source_type:'youtube',external_id:'abcdefghijk'};
const native={id:'native-row',source_type:'user_upload',external_id:null};
test('the same YouTube video is deduplicated across database and discovery entries',()=>{
 assert.deepEqual(unseenReelQueue([imported,fallback,native],new Set()),[imported,native]);
 assert.equal(reelContentKey(imported),reelContentKey(fallback));
});
test('a watched video remains playing and disappears as soon as the queue advances',()=>{
 const watched=new Set(['abcdefghijk']);
 assert.deepEqual(unseenReelQueue([imported,fallback,native],watched,imported.id),[imported,native]);
 assert.deepEqual(unseenReelQueue([imported,fallback,native],watched,native.id),[native]);
 assert.deepEqual(unseenReelQueue([imported,fallback,native],watched),[native]);
});
test('native and imported watched entries are excluded together and advancement never wraps',()=>{
 assert.deepEqual(unseenReelQueue([imported,native],new Set(['abcdefghijk','reel:native-row'])),[]);
 assert.equal(nextReelId([imported,native],imported.id),native.id);
 assert.equal(nextReelId([imported,native],native.id),null);
 assert.equal(nextReelId([native],'missing'),null);
});
