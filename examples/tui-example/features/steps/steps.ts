import { test } from './fixtures.js';
import { registerTuiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerTuiSteps(test);
registerSharedSteps(test);

export { test };
