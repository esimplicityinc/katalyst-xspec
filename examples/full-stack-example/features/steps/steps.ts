import { test } from './fixtures.js';
import { registerApiSteps, registerUiSteps, registerSharedSteps } from '@esimplicitylabs/katalyst-xspec/steps';

// Every step works in every scenario, so one file can mix API and UI steps.
registerApiSteps(test);
registerUiSteps(test);
registerSharedSteps(test);

export { test };
