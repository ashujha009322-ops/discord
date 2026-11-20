import "server-only";

import { ActionError } from "./Errors";
import type { ActionResult } from "./Types";

/**
 * Wraps the body of a server action so every action returns the same
 * `ActionResult<T>` shape without repeating try/catch + auth + error plumbing.
 *
 *   export async function deleteMessage(input: DeleteMessageInput) {
 *     return runAction("deleteMessage", async () => {
 *       ...throw new ActionError("FORBIDDEN", "...") on expected failures...
 *       return { id };
 *     });
 *   }
 */
export async function runAction<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    if (error instanceof ActionError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.fieldErrors && { fieldErrors: error.fieldErrors }),
      };
    }

    // Unexpected: log the details here, keep them away from the client.
    console.error(`[messages] ${name} failed:`, error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
      code: "INTERNAL",
    };
  }
}
