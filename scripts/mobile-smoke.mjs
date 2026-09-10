import { writeFile } from "node:fs/promises";
const base = "http://127.0.0.1:5173";
const ready = await fetch(base + "/auth");
if (!ready.ok) throw new Error("Local app is not ready");
const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then(
  (r) => r.json(),
);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
const errors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const call = pending.get(message.id);
    if (call) {
      clearTimeout(call.timer);
      pending.delete(message.id);
      message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result);
    }
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(
      message.params.exceptionDetails.exception?.description ??
        message.params.exceptionDetails.text,
    );
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("CDP timeout: " + method));
    }, 20000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
await send("Page.enable");
await send("Runtime.enable");
const results = [];
try {
  for (const width of [320, 360, 375, 390, 412, 430]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    for (const path of ["/auth", "/reset-password", "/missing-page", "/explore"]) {
      await send("Page.navigate", { url: base + path });
      await new Promise((resolve) => setTimeout(resolve, 1800));
      const response = await send("Runtime.evaluate", {
        expression:
          "JSON.stringify({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, pathname: location.pathname, title: document.title, text: document.body.innerText.slice(0,180) })",
        returnByValue: true,
      });
      const value = JSON.parse(response.result.value);
      results.push({
        requested: path,
        viewport: width,
        ...value,
        overflow: value.scrollWidth > value.width,
        loaded:
          value.pathname === (path === "/explore" ? "/auth" : path) &&
          value.text.length > 0 &&
          !value.text.includes("ERR_CONNECTION"),
      });
    }
  }
  await writeFile(
    "mobile-validation.json",
    JSON.stringify(
      {
        scope: "Unauthenticated routes only; protected Explore should redirect to auth.",
        results,
        errors,
      },
      null,
      2,
    ),
  );
  const failures = results.filter((r) => !r.loaded || r.overflow);
  if (failures.length || errors.length) process.exitCode = 1;
  console.log(JSON.stringify({ checks: results.length, failures, errors }, null, 2));
} finally {
  await send("Page.close").catch(() => {});
  socket.close();
}
