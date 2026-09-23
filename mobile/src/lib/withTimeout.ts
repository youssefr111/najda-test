/**
 * Races any promise against a hard timeout. Unlike relying solely on
 * AbortController (whose cancellation isn't always reliably honored by
 * React Native's fetch/networking stack on every RN version/device), this
 * guarantees the calling code moves on and shows an error after `ms`,
 * even if the underlying operation is still hung in the background.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
