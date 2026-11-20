import { ActionError } from "./Errors";
import type { FieldErrors } from "./Types";

/**
 * Structural types on purpose: they describe only what we read from a Zod
 * result, so this file compiles unchanged on Zod 3 and Zod 4 (and does not
 * rely on `error.flatten()`, which Zod 4 deprecates).
 */
type IssueLike = { path: ReadonlyArray<PropertyKey>; message: string };
type ZodErrorLike = { issues: ReadonlyArray<IssueLike> };
type SafeParser<T> = {
  safeParse(
    input: unknown,
  ): { success: true; data: T } | { success: false; error: ZodErrorLike };
};

/**
 * Groups issues by their top-level field (`files.2` -> `files`) and uses the
 * first message as the human-readable `error`. Issues with no path land under
 * the `form` key.
 */
export function validationError(error: ZodErrorLike): ActionError {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "form";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  return new ActionError(
    "VALIDATION",
    error.issues[0]?.message ?? "Invalid input.",
    fieldErrors,
  );
}

/** Parses `input` with `schema` or throws a VALIDATION ActionError. */
export function parseOrThrow<T>(schema: SafeParser<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}