import http from 'k6/http';
import { check, sleep } from 'k6';
import type { Options } from 'k6/options';

const BASE_URL = __ENV.GOREST_BASE_URL || 'https://gorest.co.in/public/v2';
const TOKEN = __ENV.GOREST_TOKEN;

export const options: Options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000']
  }
};

export default function () {
  const params = TOKEN
    ? {
        headers: {
          Authorization: `Bearer ${TOKEN}`
        }
      }
    : {};

  const response = http.get(`${BASE_URL}/users`, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has content': (r) => {
      if (typeof r.body === 'string') {
        return r.body.length > 0;
      }

      if (r.body instanceof ArrayBuffer) {
        return r.body.byteLength > 0;
      }

      return false;
    }
  });

  sleep(1);
}
