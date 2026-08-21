import { z, type ZodType } from "zod";

export const parse = <T>(schema: ZodType<T>, value: unknown): T =>
  schema.parse(value);

export const routeId = (value: unknown): string => z.uuid().parse(value);
