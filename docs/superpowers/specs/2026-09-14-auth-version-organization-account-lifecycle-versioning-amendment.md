# Versioning Amendment

This amendment is part of `2026-09-14-auth-version-organization-account-lifecycle-design.md` and resolves the versioning ambiguity found during self-review.

## Final decision

Use:

```json
{
  "cli": {
    "appVersionSource": "local"
  },
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

`expo.version` remains the manually controlled user-facing application version.

With `appVersionSource: "local"`, boolean `production.autoIncrement: true` is retained only to increment developer-facing native build counters:

- Android `android.versionCode`
- iOS `ios.buildNumber`

It is not used as the source of truth for `expo.version`.

## Production-build safety requirement

Before the first production EAS build after switching from remote to local version source, the repository's developer-facing build counters must be synchronized with the last accepted store builds.

Current repository state is not sufficient to invent those values:

- Android has a local `versionCode`, but its relationship to the latest accepted Play Store build must be verified before release.
- iOS currently has no explicit `ios.buildNumber` in `app.json`, so a production build must not proceed until the latest accepted App Store/TestFlight build number is known and written to local app config.

Do not guess either value.

This requirement does not block frontend feature implementation, but it blocks the first production store build after the version-source migration until the store counters are confirmed.
