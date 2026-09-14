# Mobile Production Hardening — Security Plan Amendment

This amendment resolves the implementation-plan self-review gap for Task 6 and is part of `docs/superpowers/plans/2026-09-14-mobile-production-hardening.md`.

## Reusable PIN fallback UI

Create `src/modules/pin-auth/components/SensitiveActionReauthModal.tsx` with this public contract:

```ts
export interface SensitiveActionReauthModalProps {
  visible: boolean;
  title: string;
  description?: string;
  biometricAvailable: boolean;
  biometricLabel?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onBiometric(): void;
  onSubmitPin(pin: string): void;
  onCancel(): void;
}
```

Behavior:

- The sensitive action controller may attempt biometrics first only when biometrics are enabled and available.
- If biometrics are unavailable, cancelled, or do not authorize the action, show the modal PIN fallback.
- Current PIN verification accepts exactly four numeric digits. Do not apply weak-new-PIN rules when verifying an existing PIN.
- Invalid current PIN remains in the modal with a localized inline error. Attempt-count/logout behavior must use the existing security semantics rather than a new parallel counter.
- Cancel is a neutral outcome: close the modal and do not show an application-error toast.
- Successful authorization is valid for the current sensitive action only.
- `AccountSecurityScreen` uses this modal for PIN removal and biometric enable/disable fallback.
- `PinChangeScreen` does not open this modal because its existing current-PIN step is already the required re-authentication.

Add UZ/RU translation keys for identity verification, current PIN, invalid current PIN, biometric verification, and cancel copy as needed.

## Task 6 file list amendment

Add:

- Create: `src/modules/pin-auth/components/SensitiveActionReauthModal.tsx`
- Test: pure re-auth decision/attempt behavior remains in `src/modules/pin-auth/services/reauthentication.test.ts`; presentation is covered by existing static contract checks plus TypeScript verification unless a component test harness is introduced later.

No other product decision changes.