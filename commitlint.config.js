export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', ['stack-tests', 'create-stack-tests', 'docs', 'deps']],
    'scope-empty': [1, 'never'],
  },
};
