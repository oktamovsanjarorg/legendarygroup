import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    broadcast_burst: {
      executor: 'shared-iterations',
      vus: 100,
      iterations: 1000,
      maxDuration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<300'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Bildirishnomalar va bot status tekshiruvi (1000 ta so'rov)
  const res = http.get(`${BASE_URL}/api/health/live`);

  check(res, {
    'notification status 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
