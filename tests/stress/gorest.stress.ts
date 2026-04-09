import type { Options } from 'k6/options';
import { getThresholds } from '../config/thresholds.js';
import { buildScenarioMix, executeScenarioMix } from '../config/scenarios.js';

export const options: Options = {
  vus: 100,
  duration: '5m',
  thresholds: getThresholds('stress')
};

const scenarios = buildScenarioMix(['listUsers', 'listPosts', 'getUserDetails', 'getUserPosts']);

export default function () {
  executeScenarioMix(scenarios);
}
