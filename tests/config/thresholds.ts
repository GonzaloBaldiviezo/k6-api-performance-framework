export const THRESHOLDS = {
  smoke: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000']
  },
  moderate: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_waiting: ['p(95)<1500']
  },
  standard: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(95)<2500', 'p(99)<4000'],
    http_req_waiting: ['p(95)<1800'],
    checks: ['rate>0.95']
  },
  stress: {
    http_req_failed: ['rate<0.20'],
    http_req_duration: ['p(95)<3500', 'p(99)<5000']
  }
};

export function getThresholds(profile: keyof typeof THRESHOLDS): Record<string, string[]> {
  return THRESHOLDS[profile];
}
