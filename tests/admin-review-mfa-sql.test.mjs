import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const read = path => fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
const migration = fs.readdirSync(new URL("../supabase/migrations/",import.meta.url)).find(p=>p.endsWith("_admin_review_requires_mfa.sql"));
const admin = "11111111-1111-4111-8111-111111111111";
const member = "22222222-2222-4222-8222-222222222222";
const item = "44444444-4444-4444-8444-444444444444";
const source = "55555555-5555-4555-8555-555555555555";
async function database(fixed=true) {
  const db = new PGlite();
  await db.exec(read("tests/fixtures/admin-review-schema.sql"));
  await db.exec(read(fixed ? "supabase/migrations/"+migration : "tests/fixtures/admin-review-before-mfa.sql"));
  return db;
}
async function identity(db, id, aal, role="authenticated") {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id??"",JSON.stringify({sub:id,aal,role})]);
  await db.exec("set role "+role);
}
const review = (db,kind="media_items",id=item,action="approve") => db.query("select public.nuru_admin_review($1,$2,$3) as result",[kind,id,action]);
async function state(db) {
  await db.exec("reset role");
  return (await db.query("select (select is_approved from public.media_items limit 1) as approved,(select count(*)::int from public.nuru_admin_audit_log) as audits")).rows[0];
}

test("observed definer boundary permits AAL1 before the fix despite table RLS",async()=>{
  const db=await database(false);
  try {await identity(db,admin,"aal1");await review(db);assert.deepEqual(await state(db),{approved:true,audits:1});}
  finally {await db.close();}
});
test("super admin without AAL2 is denied before writes or audit entries",async()=>{
  const db=await database();
  try {
    for (const aal of ["aal1",undefined,"", "AAL2"]) {
      await identity(db,admin,aal);await assert.rejects(review(db),e=>e.code==="42501");
      assert.deepEqual(await state(db),{approved:false,audits:0});
    }
  } finally {await db.close();}
});
test("AAL2 is insufficient without a stored super-admin role; anonymous execution is denied",async()=>{
  const db=await database();
  try {
    await identity(db,member,"aal2");await assert.rejects(review(db),e=>e.code==="42501");
    await identity(db,null,"aal2");await assert.rejects(review(db),e=>e.code==="42501");
    await identity(db,null,undefined,"anon");await assert.rejects(review(db),e=>e.code==="42501");
    assert.deepEqual(await state(db),{approved:false,audits:0});
  } finally {await db.close();}
});
test("AAL2 super admin can approve and reject with accurate audit records",async()=>{
  const db=await database();
  try {
    await identity(db,admin,"aal2");assert.equal((await review(db)).rows[0].result.success,true);
    await review(db,"media_sources",source,"reject");
    await db.exec("reset role");
    assert.deepEqual((await db.query("select action,previous_approval,new_approval from public.nuru_admin_audit_log order by action")).rows,[
      {action:"approve",previous_approval:false,new_approval:true},{action:"reject",previous_approval:true,new_approval:false}]);
  } finally {await db.close();}
});
test("invalid and null actions cannot mutate approvals",async()=>{
  const db=await database();
  try {
    for (const [kind,action] of [["user_roles","approve"],["media_items","delete"],[null,"approve"],["media_items",null]]) {
      await identity(db,admin,"aal2");await assert.rejects(review(db,kind,item,action),e=>e.code==="22023");
      assert.deepEqual(await state(db),{approved:false,audits:0});
    }
    await identity(db,admin,"aal2");await assert.rejects(review(db,"media_items",member));
    assert.deepEqual(await state(db),{approved:false,audits:0});
  } finally {await db.close();}
});
test("audit failure rolls back the approval in the same statement",async()=>{
  const db=await database();
  try {
    await db.exec("alter table public.nuru_admin_audit_log add constraint fail_audit check (false)");
    await identity(db,admin,"aal2");await assert.rejects(review(db),e=>e.code==="23514");
    assert.deepEqual(await state(db),{approved:false,audits:0});
  } finally {await db.close();}
});
