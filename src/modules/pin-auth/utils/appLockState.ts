export const MAX_PIN_ATTEMPTS = 5;

export interface FailedPinAttempt {
  attempts: number;
  attemptsRemaining: number;
  mustLogout: boolean;
}

export function recordFailedPinAttempt(previousAttempts: number): FailedPinAttempt {
  const attempts = Math.min(previousAttempts + 1, MAX_PIN_ATTEMPTS);
  return {
    attempts,
    attemptsRemaining: Math.max(MAX_PIN_ATTEMPTS - attempts, 0),
    mustLogout: attempts >= MAX_PIN_ATTEMPTS,
  };
}
