import { test } from './fixtures.js';
import { registerApiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerApiSteps(test);
registerSharedSteps(test);

export { test };
