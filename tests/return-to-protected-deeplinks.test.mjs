import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { rememberAfterLogin, takeAfterLogin } from "../src/lib/afterLogin.ts";
import { LEGACY_CANONICAL_INIT_SCRIPT } from "../src/lib/pwaMode.ts";
const read=(file)=>readFileSync(new URL("../"+file,import.meta.url),"utf8");

function browser(href,{standalone=false,storage=new Map()}={}){
  let moved=null;
  const location={href,replace(dest){moved=dest;}};
  const sessionStorage={getItem(k){return storage.get(k)??null;},setItem(k,v){storage.set(k,String(v));},removeItem(k){storage.delete(k);}};
  const window={location,matchMedia:()=>({matches:standalone})};
  vm.runInNewContext(LEGACY_CANONICAL_INIT_SCRIPT,{window,location,navigator:{standalone:false},URL,sessionStorage});
  return {moved,storage};
}

test("old browser deep link redirects before admin route guard, preserving exact route",()=>{
  assert.equal(browser("https://nurufaith.website/admin?section=dashboard").moved,
    "https://app.nurufaith.co.ke/admin?section=dashboard");
  assert.equal(browser("https://www.nurufaith.website/bible?chapter=3#verse16").moved,
    "https://app.nurufaith.co.ke/bible?chapter=3#verse16");
});
test("already-installed PWAs never cross origin, avoiding Chrome X tab",()=>{
  assert.equal(browser("https://nurufaith.website/admin?section=dashboard",{standalone:true}).moved,null);
});
test("old reset links and callbacks remain on their origin and preserve the post-callback session",()=>{
  const storage=new Map();
  assert.equal(browser("https://nurufaith.website/auth-callback?code=secret",{storage}).moved,null);
  assert.equal(storage.get("nuru-legacy-auth-in-progress"),"1");
  assert.equal(browser("https://nurufaith.website/home",{storage}).moved,null);
  assert.equal(browser("https://nurufaith.website/reset-password",{storage:new Map()}).moved,null);
  assert.equal(browser("https://nurufaith.website/home#access_token=token",{storage:new Map()}).moved,null);
});
test("save and consume same-origin protected return destination without open-redirects",()=>{
  const storage=new Map();
  const original=globalThis.sessionStorage;
  Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:{
    getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
  }});
  try {
    rememberAfterLogin("/admin?section=dashboard","https://app.nurufaith.co.ke");
    assert.equal(takeAfterLogin("https://app.nurufaith.co.ke"),"/admin?section=dashboard");
    assert.equal(takeAfterLogin("https://app.nurufaith.co.ke"),null);
    rememberAfterLogin("https://attacker.example/","https://app.nurufaith.co.ke");
    assert.equal(takeAfterLogin("https://app.nurufaith.co.ke"),null);
    rememberAfterLogin("//attacker.example/","https://app.nurufaith.co.ke");
    assert.equal(takeAfterLogin("https://app.nurufaith.co.ke"),null);
    rememberAfterLogin("/auth?mode=login","https://app.nurufaith.co.ke");
    assert.equal(takeAfterLogin("https://app.nurufaith.co.ke"),null);
  }finally{
    if(original===undefined)delete globalThis.sessionStorage;
    else Object.defineProperty(globalThis,"sessionStorage",{configurable:true,value:original});
  }
});
test("email, Google, and session-restoration routes consume protected return destination",()=>{
  assert.match(read("src/routes/auth.tsx"),/takeAfterLogin\(window\.location\.origin\)/);
  assert.match(read("src/routes/auth-callback.tsx"),/takeAfterLogin\(window\.location\.origin\)/);
  assert.match(read("src/routes/_authenticated/route.tsx"),/rememberAfterLogin\(location\.href, window\.location\.origin\)/);
  assert.match(read("src/routes/__root.tsx"),/LEGACY_CANONICAL_INIT_SCRIPT/);
  assert.match(read("src/routes/__root.tsx"),/dangerouslySetInnerHTML=\{\{ __html: LEGACY_CANONICAL_INIT_SCRIPT \}\}/);
});

test("unavailable SMS sign-in does not appear as a broken option",()=>{
  const auth=read("src/routes/auth.tsx");
  assert.match(auth,/providers\?\.phone === true && \(/);
  assert.doesNotMatch(auth,/SMS sign-in is not enabled yet/);
});
