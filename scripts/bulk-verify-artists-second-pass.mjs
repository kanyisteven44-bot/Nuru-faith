import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.YOUTUBE_API_KEY;
if (!key) throw new Error("YOUTUBE_API_KEY is required.");
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const QUOTA_BUDGET = 850;
let quota = 0;

const QUERIES = [
  { q: "gospel singer songwriter official channel", region: "US", lang: "en", languages: ["en"] },
  { q: "christian worship artist official music", region: "US", lang: "en", languages: ["en"] },
  { q: "African gospel singer songwriter official", region: "NG", lang: "en", languages: ["en"] },
  { q: "gospel music artist official channel", region: "GB", lang: "en", languages: ["en"] },
  { q: "praise worship singer official music", region: "ZA", lang: "en", languages: ["en"] },
  { q: "musique gospel artiste officiel louange", region: "CD", lang: "fr", languages: ["fr"] },
  { q: "música gospel cantor oficial louvor", region: "BR", lang: "pt", languages: ["pt"] },
  { q: "música cristiana cantante oficial adoración", region: "MX", lang: "es", languages: ["es"] },
];

const FAITH = [
 "gospel","worship","praise","christian","jesus","christ","hymn","minstrel",
 "injili","sifa","ibada","bwana","mungu","yesu","ngai","nyasaye","mwathani",
 "asis","enkai","akuj","murungu","évangile","evangile","chrétien","chretien",
 "louange","adoration","jésus","louvor","adoração","adoracao","cristão","cristao",
 "alabanza","adoración","adoracion","cristiano","jesús"
];
const BLOCK = [
 "dj ","dj-","mixtape","nonstop mix","mix vol","karaoke","lyrics channel",
 "news","politics","movie","film","trailer","comedy","radio station","television network",
 "record label","distribution","music distributor"
];

function norm(s){return String(s??"").toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu,"");}
function hasAny(text,words){const n=norm(text);return words.some(w=>n.includes(norm(w)));}
function cleanString(value){
 return value.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,"\uFFFD");
}
function clean(value){
 if(typeof value==="string") return cleanString(value);
 if(Array.isArray(value)) return value.map(clean);
 if(value&&typeof value==="object") return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)]));
 return value;
}
async function yt(path,params,cost){
 if(quota+cost>QUOTA_BUDGET) throw new Error("local quota budget reached");
 quota+=cost;
 const url=new URL(`https://www.googleapis.com/youtube/v3/${path}`);
 url.search=new URLSearchParams({...params,key}).toString();
 const res=await fetch(url,{signal:AbortSignal.timeout(20000)});
 if(!res.ok) throw new Error(`YouTube ${path} returned ${res.status}: ${(await res.text()).slice(0,180)}`);
 return res.json();
}
async function existingIds(){
 if(!SUPABASE_URL||!SUPABASE_KEY) return new Set();
 const u=new URL("/rest/v1/approved_youtube_channels",SUPABASE_URL);
 u.search=new URLSearchParams({select:"channel_id",limit:"5000"}).toString();
 const res=await fetch(u,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`},signal:AbortSignal.timeout(15000)});
 if(!res.ok) return new Set();
 return new Set((await res.json()).map(r=>r.channel_id).filter(Boolean));
}
const existing=await existingIds();
const seen=new Set(existing);
const artists=[];
const failures=[];
for(const spec of QUERIES){
 try{
   const search=await yt("search",{part:"snippet",q:spec.q,type:"channel",maxResults:"50",safeSearch:"strict",order:"relevance",regionCode:spec.region,relevanceLanguage:spec.lang},100);
   const ids=[...new Set((search.items??[]).map(i=>i.snippet?.channelId??i.id?.channelId).filter(Boolean))].filter(id=>!seen.has(id));
   if(!ids.length) continue;
   const detail=await yt("channels",{part:"snippet,statistics,topicDetails,brandingSettings",id:ids.join(","),maxResults:"50"},1);
   for(const c of detail.items??[]){
     if(seen.has(c.id)) continue;
     const text=[c.snippet?.title,c.snippet?.description,c.brandingSettings?.channel?.keywords].filter(Boolean).join(" ");
     const videos=Number(c.statistics?.videoCount??0);
     const topicMusic=(c.topicDetails?.topicCategories??[]).some(v=>/wikipedia\.org\/wiki\/Music/i.test(v));
     if(videos<3||!topicMusic||!hasAny(text,FAITH)||hasAny(text,BLOCK)) continue;
     const title=norm(c.snippet?.title);
     if(/\b(church|cathedral|parish|diocese|chapel|news|radio|network)\b/.test(title) &&
        !hasAny(text,["music","choir","worship","singer","artist","band","songs"])) continue;
     seen.add(c.id);
     artists.push({
       name:c.snippet?.title?.trim()||c.id,
       youtube_channel_id:c.id,
       country:c.snippet?.country??null,
       description:(c.snippet?.description??"").slice(0,700)||null,
       avatar_url:c.snippet?.thumbnails?.high?.url??c.snippet?.thumbnails?.medium?.url??c.snippet?.thumbnails?.default?.url??null,
       language_codes:spec.languages,
       discovered_by:spec.q,
       verified_at:new Date().toISOString().slice(0,10),
       verification_basis:"Second-pass channel audit: YouTube music-topic channel self-identifies with Christian/gospel/worship language, has at least three uploads, and is not a blocked DJ/mix/media/label source."
     });
   }
 }catch(error){
   failures.push({query:spec.q,error:error instanceof Error?error.message:String(error)});
   if(/403|quota/i.test(failures.at(-1).error)) break;
 }
}
const out=clean({
 generated_at:new Date().toISOString(),
 existing_approved_channels_seen:existing.size,
 verified_new:artists.length,
 quota_spent_estimate:quota,
 failures,
 artists
});
await mkdir("public",{recursive:true});
await writeFile("public/verified-artists-second-pass.json",JSON.stringify(out,null,2)+"\n");
console.log(`Second artist pass: ${artists.length} new channels; existing=${existing.size}; quota≈${quota}; failures=${failures.length}`);
