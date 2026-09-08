export type ToastDismissDirection = "left" | "right" | "up";

const DISMISS_DISTANCE = 72;
const DISMISS_VELOCITY = 650;

export function getToastDismissDirection(
  translationX: number,
  translationY: number,
  velocityX: number,
  velocityY: number,
): ToastDismissDirection | null {
  "worklet";

  const horizontalIntent =
    Math.abs(translationX) + Math.abs(velocityX) / 10;
  const verticalIntent = Math.abs(translationY) + Math.abs(velocityY) / 10;
  const horizontalIsDominant = horizontalIntent >= verticalIntent;

  if (horizontalIsDominant) {
    if (
      translationX <= -DISMISS_DISTANCE ||
      velocityX <= -DISMISS_VELOCITY
    ) {
      return "left";
    }
    if (
      translationX >= DISMISS_DISTANCE ||
      velocityX >= DISMISS_VELOCITY
    ) {
      return "right";
    }
    return null;
  }

  if (translationY <= -DISMISS_DISTANCE || velocityY <= -DISMISS_VELOCITY) {
    return "up";
  }

  return null;
}
