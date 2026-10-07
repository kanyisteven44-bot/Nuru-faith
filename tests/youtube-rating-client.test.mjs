import test from 'node:test';
import assert from 'node:assert/strict';
import {youtubeRatingRequest,YouTubeConnectionRequired} from '../src/lib/youtubeRatingClient.ts';
test('YouTube likes and unlikes call the authenticated rating endpoint',async()=>{
 for(const rating of ['like','none']) {
  const result=await youtubeRatingRequest('abcdefghijk','fixture-provider-token',rating,async(url,options)=>{
   assert.equal(url,`https://www.googleapis.com/youtube/v3/videos/rate?id=abcdefghijk&rating=${rating}`);
   assert.equal(options.method,'POST');
   assert.equal(options.headers.Authorization,'Bearer fixture-provider-token');
   return new Response(null,{status:204});
  });
  assert.equal(result,rating);
 }
});
test('missing consent and expired credentials never pretend a like succeeded',async()=>{
 await assert.rejects(youtubeRatingRequest('abcdefghijk',null,'like',()=>{throw new Error('must not call')}),YouTubeConnectionRequired);
 await assert.rejects(youtubeRatingRequest('abcdefghijk','fixture-provider-token','like',async()=>new Response(null,{status:401})),YouTubeConnectionRequired);
 await assert.rejects(youtubeRatingRequest('abcdefghijk','fixture-provider-token','like',async()=>Response.json({error:{errors:[{reason:'insufficientPermissions'}]}},{status:403})),YouTubeConnectionRequired);
});
test('rating reads use the actual YouTube account state and API failures reject',async()=>{
 assert.equal(await youtubeRatingRequest('abcdefghijk','fixture-provider-token',undefined,async()=>Response.json({items:[{rating:'like'}]})),'like');
 await assert.rejects(youtubeRatingRequest('abcdefghijk','fixture-provider-token','like',async()=>new Response(null,{status:500})),/could not update/);
});
