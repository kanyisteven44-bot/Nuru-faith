import test from 'node:test';
import assert from 'node:assert/strict';
import { response, commentsResponse } from '../src/lib/youtubeReelMetadata.ts';
test('public YouTube counts preserve missing values and large string counts',()=>{
 const video=response.parse({items:[{id:'abcdefghijk',snippet:{title:'Worship',channelId:'UCchannel'},statistics:{viewCount:'1234567890123',commentCount:'0'}}]}).items[0];
 assert.equal(video.statistics.viewCount,'1234567890123');
 assert.equal(video.statistics.commentCount,'0');
 assert.equal(video.statistics.likeCount,undefined);
});
test('channel uploads retain pagination and actual video identifiers',()=>{
 const rows=response.parse({nextPageToken:'next-page',items:[{id:'playlist-entry',snippet:{title:'New song',thumbnails:{medium:{url:'https://i.ytimg.com/image.jpg'}}},contentDetails:{videoId:'abcdefghijk'}}]});
 assert.equal(rows.nextPageToken,'next-page');
 assert.equal(rows.items[0].contentDetails.videoId,'abcdefghijk');
});
test('public comments retain author, text, likes and reply totals',()=>{
 const rows=commentsResponse.parse({items:[{id:'thread-id',snippet:{totalReplyCount:4,topLevelComment:{snippet:{authorDisplayName:'Worship listener',authorProfileImageUrl:'https://example.com/avatar.jpg',textDisplay:'Wonderful song <3',likeCount:12,publishedAt:'2026-10-07T00:00:00Z'}}}}]});
 assert.equal(rows.items[0].snippet.totalReplyCount,4);
 assert.equal(rows.items[0].snippet.topLevelComment.snippet.likeCount,12);
 assert.equal(rows.items[0].snippet.topLevelComment.snippet.textDisplay,'Wonderful song <3');
 assert.equal(commentsResponse.safeParse({items:[{id:'bad',snippet:{}}]}).success,false);
});
