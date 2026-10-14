import test from "node:test";
import assert from "node:assert/strict";
import { canonical, targets, responseErrors } from "../scripts/check-production-domains.mjs";
const headers = { "content-type":"text/html", "content-security-policy":"default-src 'self'", "strict-transport-security":"max-age=31536000" };
const response = (status=200, extra={}) => new Response("", {status, headers:{...headers,...extra}});

test("monitor checks current apex PWA resources and retains both legacy origins", () => {
  assert.equal(canonical, "https://nurufaith.co.ke");
  for (const path of ["/", "/about", "/auth?mode=login", "/sitemap.xml", "/manifest.webmanifest", "/sw.js"])
    assert.ok(targets.some(t => t.url === canonical + path), path);
  assert.ok(targets.some(t => t.url.startsWith("https://app.nurufaith.co.ke/")));
  assert.ok(targets.some(t => t.url.startsWith("https://nurufaith.website/")));
});
test("current canonical passes and obsolete canonical still fails", () => {
  const target = {url:canonical+"/",type:"homepage"};
  assert.deepEqual(responseErrors(target,response(),'<link rel="canonical" href="https://nurufaith.co.ke/">'),[]);
  assert.ok(responseErrors(target,response(),'<link rel="canonical" href="https://app.nurufaith.co.ke/">').some(e=>e.includes("incorrect canonical")));
});
test("temporary host can redirect only to current apex", () => {
  const target = {url:"https://app.nurufaith.co.ke/",type:"temporary"};
  assert.deepEqual(responseErrors(target,response(308,{location:canonical+"/"}),""),[]);
  for (const location of ["https://evil.test/", "https://ministry.nurufaith.co.ke/", "https://nurufaith.co.ke.evil.test/"])
    assert.equal(responseErrors(target,response(308,{location}),"").length,1);
  assert.ok(responseErrors(target,response(503),"").length>0);
});
test("private indexing and canonical security failures remain failures", () => {
  assert.ok(responseErrors({url:canonical+"/auth",type:"private"},response(),"<h1>Sign in</h1>").some(e=>e.includes("indexable")));
  assert.ok(responseErrors({url:canonical+"/",type:"homepage"},response(302,{location:"/welcome"}),"").some(e=>e.includes("unexpected redirect")));
});
