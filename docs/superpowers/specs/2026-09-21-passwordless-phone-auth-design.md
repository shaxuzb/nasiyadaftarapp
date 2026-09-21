# Passwordless Phone Authentication Design

**Goal:** Move mobile login and registration to a shared phone-number OTP flow while preserving Google/Apple sign-in, PIN protection, and organization routing.

## Accepted backend contract

- `POST /account/phone/request` accepts `{ phoneNumber }` and returns `{ maskedPhone, expiresInSeconds }`.
- `POST /account/phone/confirm` accepts `{ phoneNumber, code }` and returns the existing auth response: `{ token, refreshToken, user }`.
- A confirmed phone can create a new user automatically; the response may contain `fullName: null` and `hasOrganization: false`.
- Google sign-in remains `POST /account/google` with `{ idToken }`.
- Apple sign-in remains `POST /account/apple` with `{ identityToken }` and is shown only on iOS.
- Organization entry is determined by `user.hasOrganization`, not by whether the user came from login or register.

## UX and data flow

1. Login and register routes render the same phone-first screen with contextual copy.
2. The user enters a phone number and requests a code.
3. The verification screen displays the masked phone and server expiry timer, reuses the shared Android/iOS OTP AutoFill input, and confirms automatically after six digits.
4. The phone confirm response is passed through the existing `completeAuth` path so SecureStore, refresh-token handling, subscription sync, organization resolution, and PIN gating remain centralized.
5. `hasOrganization === false` opens organization setup; `hasOrganization === true` resolves the current organization or organization selector.

## Security and compatibility rules

- No password is collected or sent by the phone flow.
- Existing password reset and password-change UI must not be used by the new phone flow; cleanup is limited to the screens/routes included in the implementation phase.
- `fullName` is nullable for newly created phone users. PIN display metadata and profile display must use a safe fallback.
- Only the phone auth routes are made public in the Axios route matcher. Profile routes remain authenticated.
- The app never calls the admin phone recovery endpoint.

## Out of scope for this phase

- Google/Apple profile-link update (`PUT /account/profile/google` and `PUT /account/profile/apple`) until their response shape is supplied.
- Manual Apple email editing; Apple private-relay email remains provider-owned.
