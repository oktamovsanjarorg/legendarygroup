import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // Ramp-up 50 VU
    { duration: '1m', target: 200 }, // Ramp-up 200 VU
    { duration: '2m', target: 200 }, // Sustain 200 VU
    { duration: '30s', target: 0 }, // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% so'rovlar < 300ms
    http_req_failed: ['rate<0.01'], // Xatolik darajasi < 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // 1. Health check & Metrikalar
  const liveRes = http.get(`${BASE_URL}/api/health/live`);
  check(liveRes, {
    'liveness status 200': (r) => r.status === 200,
  });

  const readyRes = http.get(`${BASE_URL}/api/health/ready`);
  check(readyRes, {
    'readiness status 200': (r) => r.status === 200,
  });

  const metricsRes = http.get(`${BASE_URL}/api/health/metrics`);
  check(metricsRes, {
    'metrics status 200': (r) => r.status === 200,
  });

  // 2. Landing lid yuborish (har 5-foydalanuvchida)
  if (__VU % 5 === 0) {
    const leadPayload = JSON.stringify({
      fullName: `Yuklama Test Foydalanuvchi ${__VU}_${__ITER}`,
      phone: `+99890${Math.floor(1000000 + Math.random() * 9000000)}`,
      source: 'landing',
    });
    const leadRes = http.post(`${BASE_URL}/api/public/leads`, leadPayload, {
      headers: { 'Content-Type': 'application/json' },
    });
    check(leadRes, {
      'lead created 202 or 200': (r) => r.status === 200 || r.status === 202,
    });
  }

  sleep(1);
}
