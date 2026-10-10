import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src=readFileSync(new URL("../src/components/nuru/PublicSeoLanding.tsx",import.meta.url),"utf8");
test("Nuru home logo and breadcrumb genuinely link to official homepage",()=>{
  assert.match(src,/<Link to="\/" className="flex items-center gap-3" aria-label="Nuru Faith home">/);
  assert.match(src,/<Link to="\/" className="hover:text-foreground hover:underline">Nuru Faith<\/Link>/);
  assert.match(src,/item: "https:\/\/app\.nurufaith\.co\.ke\/",/);
  assert.doesNotMatch(src,/<a href="\/about" className="flex items-center gap-3"/);
});
test("public CTA navigation is handled by the app instead of reloading the entire page",()=>{
  assert.match(src,/import \{ Link \} from "@tanstack\/react-router"/);
  assert.match(src,/<Link\s+to="\/auth"\s+search=\{\{ mode: "signup" \}\}/);
  assert.match(src,/Join Nuru\s*<\/Link>/);
  assert.match(src,/Create a free account\s*<\/Link>/);
  assert.match(src,/<Link\s+to="\/about"/);
  assert.match(src,/Explore Nuru Faith\s*<\/Link>/);
  assert.match(src,/<Link to="\/privacy"/);
  assert.match(src,/<Link to="\/terms"/);
});
test("canonical and privacy/SEO copy remain unchanged",()=>{
  assert.match(src,/"https:\/\/app\.nurufaith\.co\.ke\/#website"/);
  assert.match(src,/application\/ld\+json/);
  assert.match(src,/PublicSeoLanding/);
});
