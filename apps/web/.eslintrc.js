module.exports = {
  extends: ['next/core-web-vitals', 'plugin:prettier/recommended'],
  root: true,
  ignorePatterns: ['.eslintrc.js', '.next/', 'node_modules/'],
  rules: {
    'react/no-unescaped-entities': 'off',
    '@next/next/no-html-link-for-pages': 'off',
  },
};
