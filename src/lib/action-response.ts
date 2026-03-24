export type ActionResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export function success<T>(data: T): ActionResponse<T> {
  return { success: true, data };
}

export function error(message: string): ActionResponse<never> {
  return { success: false, error: message };
}
