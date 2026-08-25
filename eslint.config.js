export default [
  {
    ignores: ["node_modules/**", "dist/**", "coverage/**", "drizzle/meta/**"],
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": ["error", { args: "none", ignoreRestSiblings: true }],
      "no-unreachable": "error",
      "no-constant-condition": "error",
    },
  },
];
