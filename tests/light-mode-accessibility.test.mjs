import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
const light = styles.split(":root {")[1].split("\n.dark {")[0];
const dark = styles.split("\n.dark {")[1].split("\n@layer base")[0];
function token(block, name) {
  const hit = block.match(new RegExp("\\s--" + name + ":\\s*(#[0-9a-fA-F]{6});"));
  assert.ok(hit, "missing " + name);
  return hit[1];
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v,16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055)**2.4);
  return rgb[0]*0.2126 + rgb[1]*0.7152 + rgb[2]*0.0722;
}
function contrast(a,b) {
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
test("light theme text remains legible on white cards and off-white ground",()=>{
  const muted=token(light,"muted-foreground");
  assert.ok(contrast(muted,token(light,"card")) >= 4.5,"card text contrast");
  assert.ok(contrast(muted,token(light,"background")) >= 4.5,"page text contrast");
  assert.ok(contrast(token(light,"ink-3"),token(light,"card")) >= 4.5,"tertiary labels");
});
test("light theme button label and badge foreground pass AA, preserving brand blue",()=>{
  const primary=token(light,"primary");
  assert.ok(contrast(primary,token(light,"primary-foreground")) >= 4.5,"primary button");
  assert.ok(contrast(primary,"#ecf1f8") >= 4.5,"hero badge on blue tinted surface");
  assert.ok(contrast(token(light,"leaf"),token(light,"background")) >= 4.5,"blue link on page");
});
test("approved dark Nuru color tokens remain unchanged",()=>{
  assert.equal(token(dark,"primary"),"#5b9ae8");
  assert.equal(token(dark,"background"),"#14161a");
  assert.equal(token(dark,"muted-foreground"),"#8992a0");
});
