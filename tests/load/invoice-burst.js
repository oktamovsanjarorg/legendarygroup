import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    invoice_generation: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const INTERNAL_TOKEN =
  __ENV.INTERNAL_API_TOKEN || 'dev_internal_token_secret_for_tests_min_32_chars';

export default function () {
  // Oylik to'lovlar va qarzdorlik hisob-kitobini tekshirish
  const res = http.get(`${BASE_URL}/internal/ping`, {
    headers: {
      'x-internal-token': INTERNAL_TOKEN,
    },
  });

  check(res, {
    'internal ping ok 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
