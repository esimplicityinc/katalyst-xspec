import { test } from './fixtures.js';
import { registerUiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

registerUiSteps(test);
registerSharedSteps(test);

export { test };
