// next-kit:eslint-restricted-imports v3
const restrictedImportPaths = [];
export default [
  { rules: { 'no-restricted-imports': ['error', { paths: restrictedImportPaths }] } },
];
