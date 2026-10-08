import test from 'node:test';
import assert from 'node:assert/strict';
import { isPresentableReel, diversifyReels } from '../src/lib/reelPresentation.ts';
import { unseenReelQueue } from '../src/lib/reelQueue.ts';
const base = { creator_name: 'Church youth', caption: 'Faith at work', source_type: 'user_upload', external_id: null, video_url: 'https://example.com/faith.mp4' };
test('published test fixtures and unplayable cards never enter discovery', () => {
 assert.equal(isPresentableReel({...base, creator_name:'Nuru Test Content'}),false);
 assert.equal(isPresentableReel({...base, caption:'[Test reel 3/5] Sample clip'}),false);
 assert.equal(isPresentableReel({...base, video_url:null}),false);
 assert.equal(isPresentableReel({...base, caption:'Testing our faith in difficult times'}),true);
 assert.equal(isPresentableReel({...base, source_type:'youtube',external_id:'abcdefghijk',video_url:null}),true);
});
test('creator mixing preserves every distinct clip and per-creator order', () => {
 const rows=[{id:'a1',creator_name:'A'},{id:'a2',creator_name:'A'},{id:'a3',creator_name:'A'},{id:'b1',creator_name:'B'},{id:'b2',creator_name:'B'},{id:'c1',creator_name:'C'}];
 assert.deepEqual(diversifyReels(rows).map(r=>r.id),['a1','b1','c1','a2','b2','a3']);
 assert.equal(rows[1].id,'a2');
});
test('copies of an uploaded clip share identity even across signed URL refreshes', () => {
 const rows=[{...base,id:'row1',video_url:'https://project.supabase.co/storage/v1/object/sign/reels/clip.mp4?token=old'},{...base,id:'row2',video_url:'https://project.supabase.co/storage/v1/object/sign/reels/clip.mp4?token=new'}];
 assert.equal(unseenReelQueue(rows,new Set()).length,1);
 assert.deepEqual(unseenReelQueue(rows,new Set(['media:https://project.supabase.co/storage/v1/object/sign/reels/clip.mp4'])),[]);
});
test('returning from playback to discovery drops the watched retained item', () => {
 const rows=[{...base,id:'one',source_type:'youtube',external_id:'abcdefghijk'},{...base,id:'two',source_type:'youtube',external_id:'zyxwvutsrqp'}];
 const watched=new Set(['abcdefghijk']);
 assert.equal(unseenReelQueue(rows,watched,'one')[0].id,'one');
 assert.deepEqual(unseenReelQueue(rows,watched,null).map(r=>r.id),['two']);
});
