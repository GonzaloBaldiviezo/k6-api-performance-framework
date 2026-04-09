import type { Options } from 'k6/options';
import { getThresholds } from '../config/thresholds.js';
import { buildScenarioMix, executeScenarioMix } from '../config/scenarios.js';

export const options: Options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '2m', target: 10 },
    { duration: '30s', target: 0 }
  ],
  thresholds: getThresholds('moderate')
};

const scenarios = buildScenarioMix(['listUsers', 'listPosts', 'getUserDetails', 'getUserPosts']);

export default function () {
  executeScenarioMix(scenarios);
}
