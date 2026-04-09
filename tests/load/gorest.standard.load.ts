import type { Options } from 'k6/options';
import { getThresholds } from '../config/thresholds.js';
import { buildScenarioMix, executeScenarioMix } from '../config/scenarios.js';

export const options: Options = {
  stages: [
    { duration: '2m', target: 30 },
    { duration: '3m', target: 30 },
    { duration: '1m', target: 0 }
  ],
  thresholds: getThresholds('standard')
};

const scenarios = buildScenarioMix(['listUsers', 'listPosts', 'getUserDetails', 'getUserPosts']);

export default function () {
  executeScenarioMix(scenarios);
}
