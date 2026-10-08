import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWatchedVideoIds } from '../src/lib/reelWatchData.ts';
function database(history, legacy, fail=false) {
 const calls=[];
 return { calls, from(table) {
  let ids=[];let user=null;let source=null;
  const query={select(){return query},eq(column,value){if(column==='user_id')user=value;if(column==='source')source=value;return query},in(column,value){ids=value;return query},order(){return query},async range(from,to){
   calls.push({table,user,source,ids,from,to});
   if(fail)return {data:null,error:{message:'permission denied'}};
   const rows=(table==='media_history'?history:legacy).filter(r=>r.user===user && ids.includes(r.id));
   return {data:rows.slice(from,to+1).map(r=>table==='media_history'?{external_id:r.id}:{reels:{external_id:r.id}}),error:null};
  }};
  return query;
 }};
}
test('combines legacy and current history without leaking another user\'s watched list',async()=>{
 const db=database([{user:'a',id:'new'},{user:'b',id:'other'}],[{user:'a',id:'legacy'}]);
 assert.deepEqual([...await fetchWatchedVideoIds(db,'a',['new','other','legacy'])].sort(),['legacy','new']);
 assert.ok(db.calls.every(call=>call.user==='a'));
});
test('reads beyond duplicate history rows and beyond the old 240-video cutoff',async()=>{
 const ids=Array.from({length:450},(_,i)=>`video-${i}`);
 const history=[...Array.from({length:1001},()=>({user:'a',id:'video-0'})),{user:'a',id:'video-1'},{user:'a',id:'video-449'}];
 const db=database(history,[]);
 const watched=await fetchWatchedVideoIds(db,'a',ids);
 assert.ok(watched.has('video-1'));
 assert.ok(watched.has('video-449'));
 assert.ok(db.calls.every(call=>call.ids.length<=200));
 assert.ok(db.calls.some(call=>call.from===1000));
});
test('failed history reads reject rather than recycling previously watched clips',async()=>{
 await assert.rejects(fetchWatchedVideoIds(database([],[],true),'a',['video']),/Watch history could not load/);
 const db=database([],[]);
 assert.equal((await fetchWatchedVideoIds(db,'a',[])).size,0);
 assert.equal(db.calls.length,0);
});
