import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("nuru_errors");
const latency = new Trend("nuru_latency", true);
const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3000";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: Number(__ENV.VUS_1 || 50) },
        { duration: "3m", target: Number(__ENV.VUS_2 || 200) },
        { duration: "3m", target: Number(__ENV.VUS_3 || 500) },
        { duration: "1m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1500", "p(99)<3000"],
    nuru_errors: ["rate<0.01"],
  },
};

const pages = ["/", "/auth?mode=login"];

export default function () {
  const page = pages[Math.floor(Math.random() * pages.length)];
  const res = http.get(`${BASE_URL}${page}`, {
    tags: { name: page },
    timeout: "10s",
  });

  const ok = check(res, {
    "status is 2xx/3xx": (r) => r.status >= 200 && r.status < 400,
    "body returned": (r) => r.body && r.body.length > 100,
  });

  errorRate.add(!ok);
  latency.add(res.timings.duration);
  sleep(Math.random() * 2 + 1);
}
