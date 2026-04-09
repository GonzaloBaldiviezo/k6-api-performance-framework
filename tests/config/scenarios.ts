import http from 'k6/http';
import { check, sleep } from 'k6';

export interface ApiScenario {
  name: string;
  execute: () => void;
  weight: number;
}

const BASE_URL = __ENV.GOREST_BASE_URL || 'https://gorest.co.in/public/v2';
const TOKEN = __ENV.GOREST_TOKEN;

const commonHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json'
};

const authHeaders = TOKEN
  ? {
      ...commonHeaders,
      Authorization: `Bearer ${TOKEN}`
    }
  : commonHeaders;

let cachedUserIds: number[] = [];
let userIdsCacheExpiresAt = 0;

function parseJsonBody(body: string | ArrayBuffer | null): unknown {
  if (typeof body !== 'string') {
    return null;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function extractUserIds(payload: unknown): number[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  const ids: number[] = [];
  for (const item of payload) {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      const maybeId = (item as { id?: unknown }).id;
      if (typeof maybeId === 'number') {
        ids.push(maybeId);
      }
    }
  }

  return ids;
}

function refreshUserIdCache(): boolean {
  const response = http.get(`${BASE_URL}/users?page=1&per_page=20`, {
    headers: commonHeaders
  });

  if (response.status !== 200) {
    return false;
  }

  const payload = parseJsonBody(response.body as string | ArrayBuffer | null);
  const ids = extractUserIds(payload);
  if (ids.length === 0) {
    return false;
  }

  cachedUserIds = ids;
  userIdsCacheExpiresAt = Date.now() + 30_000;
  return true;
}

function getRandomUserId(): number | null {
  if (cachedUserIds.length === 0 || Date.now() >= userIdsCacheExpiresAt) {
    const refreshed = refreshUserIdCache();
    if (!refreshed) {
      return null;
    }
  }

  const idx = Math.floor(Math.random() * cachedUserIds.length);
  return cachedUserIds[idx] ?? null;
}

export const scenarios = {
  // Read scenarios (no token required)
  listUsers: (): ApiScenario => ({
    name: 'list_users',
    execute: () => {
      const response = http.get(`${BASE_URL}/users?page=1&per_page=10`, {
        headers: commonHeaders
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'has users': (r) => {
          const payload = parseJsonBody(r.body as string | ArrayBuffer | null);
          const ids = extractUserIds(payload);
          if (ids.length > 0) {
            cachedUserIds = ids;
            userIdsCacheExpiresAt = Date.now() + 30_000;
            return true;
          }

          return false;
        }
      });

      sleep(0.5);
    },
    weight: 40
  }),

  listPosts: (): ApiScenario => ({
    name: 'list_posts',
    execute: () => {
      const response = http.get(`${BASE_URL}/posts?page=1&per_page=10`, {
        headers: commonHeaders
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'has posts': (r) => {
          const body = r.body as string | ArrayBuffer | null;
          if (typeof body === 'string') return body.length > 0;
          if (body instanceof ArrayBuffer) return body.byteLength > 0;
          return false;
        }
      });

      sleep(0.5);
    },
    weight: 30
  }),

  getUserDetails: (): ApiScenario => ({
    name: 'get_user_details',
    execute: () => {
      const userId = getRandomUserId();
      if (userId === null) {
        sleep(0.5);
        return;
      }

      const response = http.get(`${BASE_URL}/users/${userId}`, {
        headers: commonHeaders
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'has user id': (r) => {
          const payload = parseJsonBody(r.body as string | ArrayBuffer | null);
          if (typeof payload !== 'object' || payload === null) {
            return false;
          }

          return 'id' in payload;
        }
      });

      sleep(0.5);
    },
    weight: 20
  }),

  getUserPosts: (): ApiScenario => ({
    name: 'get_user_posts',
    execute: () => {
      const userId = getRandomUserId();
      if (userId === null) {
        sleep(0.5);
        return;
      }

      const response = http.get(`${BASE_URL}/users/${userId}/posts`, {
        headers: commonHeaders
      });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'is array': (r) => {
          const payload = parseJsonBody(r.body as string | ArrayBuffer | null);
          return Array.isArray(payload);
        }
      });

      sleep(0.5);
    },
    weight: 10
  }),

  // Write scenarios (requires token)
  createUser: (): ApiScenario => ({
    name: 'create_user',
    execute: () => {
      if (!TOKEN) {
        return;
      }

      const payload = JSON.stringify({
        name: `Perf User ${Date.now()}`,
        email: `perf${Date.now()}@test.com`,
        gender: 'male',
        status: 'active'
      });

      const response = http.post(`${BASE_URL}/users`, payload, {
        headers: authHeaders
      });

      check(response, {
        'status is 201': (r) => r.status === 201,
        'has created user': (r) => {
          try {
            const body = JSON.parse(r.body as string);
            return body.id !== undefined;
          } catch {
            return false;
          }
        }
      });

      sleep(1);
    },
    weight: 0 // Disabled by default in most scenarios
  }),

  updateUser: (): ApiScenario => ({
    name: 'update_user',
    execute: () => {
      if (!TOKEN) {
        return;
      }

      const userId = 7984627;
      const payload = JSON.stringify({
        status: 'inactive'
      });

      const response = http.patch(`${BASE_URL}/users/${userId}`, payload, {
        headers: authHeaders
      });

      check(response, {
        'status is 200 or 404': (r) => r.status === 200 || r.status === 404
      });

      sleep(1);
    },
    weight: 0 // Disabled by default
  })
};

export function buildScenarioMix(scenarioNames: string[]): ApiScenario[] {
  return scenarioNames.map((name) => {
    const scenario = scenarios[name as keyof typeof scenarios];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${name}`);
    }
    return scenario();
  });
}

export function executeScenarioMix(mix: ApiScenario[]) {
  const totalWeight = mix.reduce((sum, s) => sum + s.weight, 0);

  if (totalWeight === 0) {
    throw new Error('Total scenario weight is 0');
  }

  const rand = Math.random() * totalWeight;
  let cumulative = 0;

  for (const scenario of mix) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      scenario.execute();
      return;
    }
  }
}
