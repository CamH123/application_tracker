const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
  }
}

export const api = async <T>(
  path: string,
  options?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { "content-type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      fields?: Array<{ field: string; message: string }>;
    };
    throw new ApiError(
      body.message ?? `Request failed (${response.status})`,
      response.status,
      body.fields,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
};

export const apiUrl = (path: string) => `${API_URL}${path}`;
