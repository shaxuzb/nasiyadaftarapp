# Mobile Production Hardening — Verification Runner Amendment

This amendment replaces the Task 1 `tsx` dependency with Node's built-in TypeScript stripping for the repository's standalone `.test.ts` files.

## Reason

The execution environment provides Node `v22.16.0`, and a direct probe confirmed that:

```bash
node --experimental-strip-types path/to/test.ts
```

can execute `.ts` modules importing other `.ts` modules. The repository's existing tests are standalone Node-style regression scripts, so adding `tsx` only for test discovery/execution is unnecessary dependency surface.

## Updated Task 1 contract

Do **not** add `tsx` and do **not** modify `package-lock.json` for the test runner.

Use scripts:

```json
{
  "test": "node --experimental-strip-types scripts/run-unit-tests.ts",
  "check": "node scripts/run-contract-checks.cjs",
  "verify": "npm run typecheck && npm test && npm run check",
  "verify:release": "npm run verify && npm run doctor && npm run audit:production"
}
```

`run-unit-tests.ts` remains the recursive sorted importer defined by the main implementation plan.

The Node experimental warning is acceptable for this developer verification script; it is not part of application runtime or production bundle behavior.
