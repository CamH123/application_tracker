import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ReopenAcknowledgementError extends ConflictError {}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "validation_error",
      fields: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof NotFoundError) {
    response.status(404).json({ error: "not_found", message: error.message });
    return;
  }
  if (error instanceof ReopenAcknowledgementError) {
    response.status(409).json({
      error: "reopen_acknowledgement_required",
      message: error.message,
    });
    return;
  }
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  if (error instanceof ConflictError || code === "23505" || code === "23503") {
    response.status(409).json({
      error: "conflict",
      message:
        error instanceof Error
          ? error.message
          : "The record conflicts with existing data",
    });
    return;
  }
  console.error(error);
  response.status(500).json({
    error: "internal_error",
    message: "The request could not be completed",
  });
};
