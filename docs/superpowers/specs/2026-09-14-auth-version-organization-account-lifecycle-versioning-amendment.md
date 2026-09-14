# Versioning Amendment

This amendment is part of `2026-09-14-auth-version-organization-account-lifecycle-design.md` and records the final frontend version-check scope.

## Final decision

Use:

```json
{
  "cli": {
    "appVersionSource": "local"
  }
}
```

The frontend update system uses only the user-facing application version from:

```text
app.json -> expo.version
```

At runtime the current version is read from `Application.nativeApplicationVersion`, with `Constants.expoConfig?.version` as fallback.

The backend request is therefore based only on semantic app version values such as `1.0.9` or `1.0.10`:

```text
GET /app-versions/check?platform=android&currentVersion=1.0.10
GET /app-versions/check?platform=ios&currentVersion=1.0.10
```

## Explicitly out of scope

The app-update feature does not use, compare, validate, display, or send:

- Android `versionCode`
- iOS `buildNumber`

No frontend app-update decision may depend on those developer-facing build counters.

This specification also does not require changing or synchronizing those counters as part of the version-check implementation.

## Update decision

The backend response remains authoritative:

```text
show update UI = updateAvailable || updateRequired
forced UI      = updateRequired
```

`latestVersion`, `minimumVersion`, and `currentVersion` are semantic application versions only.
