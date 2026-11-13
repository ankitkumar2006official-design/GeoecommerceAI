import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metric definitions
const livenessDuration = new Trend('liveness_duration_ms');
const readinessDuration = new Trend('readiness_duration_ms');
const analyticsDuration = new Trend('analytics_duration_ms');
const rateLimitHits = new Counter('rate_limit_429_hits');
const failureRate = new Rate('api_failures');

export const options = {
  stages: [
    // Stage 1: Warm-up & 10 VUs Baseline
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 10 },

    // Stage 2: Ramp to 25 VUs (Moderate Load)
    { duration: '30s', target: 25 },
    { duration: '1m',  target: 25 },

    // Stage 3: Ramp to 50 VUs (Heavy Concurrent Traffic)
    { duration: '30s', target: 50 },
    { duration: '1m',  target: 50 },

    // Stage 4: Spike to 100 VUs (Stress Ceiling on Connection Pool of 30)
    { duration: '30s', target: 100 },
    { duration: '1m',  target: 100 },

    // Stage 5: Cooldown
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    // 95% of overall requests should resolve within 1,000ms
    http_req_duration: ['p(95)<1000'],
    // Liveness probe should always respond rapidly under 100ms
    liveness_duration_ms: ['p(95)<100'],
    // Error rate (excluding intentional 429 rate limits) under 5%
    api_failures: ['rate<0.05']
  }
};

const BASE_URL = __ENV.TARGET_URL || 'https://geocommerce-api-staging.onrender.com';
const STAGING_AUTH_TOKEN = __ENV.STAGING_AUTH_TOKEN || '';

export default function () {
  // =========================================================================
  // 1. Liveness Probe (Does not touch database or ML)
  // =========================================================================
  const liveRes = http.get(`${BASE_URL}/health/live`);
  livenessDuration.add(liveRes.timings.duration);
  const liveOk = check(liveRes, {
    'liveness status is 200': (r) => r.status === 200,
    'liveness payload alive': (r) => r.json('status') === 'alive'
  });
  if (!liveOk) failureRate.add(1);

  // =========================================================================
  // 2. Readiness Probe (Checks database readiness & ML dependency)
  // =========================================================================
  const readyRes = http.get(`${BASE_URL}/health/ready`);
  readinessDuration.add(readyRes.timings.duration);
  const readyOk = check(readyRes, {
    'readiness returns 200 or 503': (r) => r.status === 200 || r.status === 503,
    'database ready reported': (r) => r.json('dependencies.database.ready') !== undefined
  });
  if (!readyOk) failureRate.add(1);

  // =========================================================================
  // 3. Authenticated Analytics Query (Exercises MongoDB Aggregation Engine)
  // =========================================================================
  if (STAGING_AUTH_TOKEN) {
    const params = {
      headers: {
        'Authorization': `Bearer ${STAGING_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'k6-Staging-Performance-Harness/1.0'
      }
    };

    const analyticsRes = http.get(`${BASE_URL}/api/analytics/overview`, params);
    analyticsDuration.add(analyticsRes.timings.duration);

    if (analyticsRes.status === 429) {
      rateLimitHits.add(1);
    } else {
      const analyticsOk = check(analyticsRes, {
        'analytics returns 200': (r) => r.status === 200,
        'analytics hasData boolean present': (r) => r.json('hasData') !== undefined
      });
      if (!analyticsOk) failureRate.add(1);
    }
  }

  // Realistic user think time between interactions
  sleep(1);
}

