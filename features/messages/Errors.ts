import type { ErrorCode, FieldErrors } from "./Types";

/**
 * Expected, user-facing failure. Throw it anywhere inside an action;
 * `runAction` converts it into `{ success: false, error, code }`.
 * Anything that is NOT an ActionError is treated as a bug: it is logged
 * server-side and the client only sees a generic message.
 */
export class ActionError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "ActionError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
