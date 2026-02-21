/**
 * http-client
 * A lightweight, framework-agnostic HTTP client built on the native fetch API.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResponseObject<T = any> {
  status: "success" | "error";
  statusCode: number;
  data: T;
}

export type BaseOptions = {
  url: string;
  /** Headers are used as-is. Merge / inject any auth tokens before passing. */
  headers?: Record<string, string>;
  /** Called immediately before the request is sent. */
  onStart?: () => void;
  /** Called after the request completes (success or failure). */
  onComplete?: () => void;
  /**
   * Controls whether cookies and auth headers are sent with the request.
   * Mirrors the native fetch `credentials` option.
   * - `"same-origin"` (browser default) — credentials for same-origin only.
   * - `"include"` — always send credentials; required for cross-origin cookie
   *   flows such as Laravel Sanctum / XSRF-TOKEN.
   * - `"omit"` — never send credentials.
   */
  credentials?: RequestCredentials;
};

export type GetOptions = BaseOptions & {
  /** When true the full parsed response body is returned, not just response.data */
  returnEntireResponse?: boolean;
};

export type PostOptions = BaseOptions & {
  data?: Record<string, any>;
  /** Defaults to POST. Use for PUT / PATCH / DELETE as well. */
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formHasFile(data: Record<string, any>): boolean {
  return Object.values(data).some(
    (value) => value instanceof File || value instanceof FileList
  );
}

function buildBody(data: Record<string, any>): FormData | string {
  if (formHasFile(data)) {
    const formData = new FormData();

    for (const key in data) {
      const value = data[key];

      if (value instanceof FileList) {
        Array.from(value).forEach((file) => formData.append(`${key}[]`, file));
      } else if (value instanceof File) {
        formData.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => formData.append(`${key}[]`, v));
      } else if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    }

    return formData;
  }

  return JSON.stringify(data);
}

function buildError<T>(statusCode: number, data: any): ResponseObject<T> {
  return { status: "error", statusCode, data };
}

function isResponseObject(value: unknown): value is ResponseObject {
  return (
    value !== null &&
    typeof value === "object" &&
    "status" in value &&
    "statusCode" in value
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform a GET request.
 *
 * Resolves with a {@link ResponseObject} on success.
 * Rejects with a {@link ResponseObject} on non-2xx status or network failure.
 */
async function get<T = any>(options: GetOptions): Promise<ResponseObject<T>> {
  const {
    url,
    headers = {},
    onStart,
    onComplete,
    returnEntireResponse = false,
    credentials,
  } = options;

  onStart?.();

  let res: Response | undefined;

  try {
    res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json", ...headers },
      redirect: "manual",
      ...(credentials !== undefined && { credentials }),
    });

    const response = await res.json();

    onComplete?.();

    if (!res.ok) {
      return Promise.reject<ResponseObject<T>>(
        buildError<T>(res.status, response?.data ?? response)
      );
    }

    return {
      status: "success",
      statusCode: res.status,
      data: returnEntireResponse ? response : (response?.data ?? response),
    };
  } catch (error) {
    onComplete?.();

    if (isResponseObject(error)) {
      return Promise.reject(error);
    }

    return Promise.reject<ResponseObject<T>>(
      buildError<T>(
        res?.status ?? 0,
        error instanceof Error ? error.message : "A network error occurred"
      )
    );
  }
}

/**
 * Perform a POST (or PUT / PATCH / DELETE) request.
 *
 * Automatically serialises `data` to JSON or `FormData` depending on whether
 * any value is a `File` / `FileList`. The `Content-Type` header is set
 * automatically for JSON payloads; for `FormData` the browser sets it (with
 * the correct boundary).
 *
 * Resolves with a {@link ResponseObject} on success.
 * Rejects with a {@link ResponseObject} on non-2xx status or network failure.
 */
async function post<T = any>(options: PostOptions): Promise<ResponseObject<T>> {
  const {
    url,
    headers = {},
    onStart,
    onComplete,
    method = "POST",
    data = {},
    credentials,
  } = options;

  const mergedHeaders: Record<string, string> = {
    accept: "application/json",
    ...headers,
  };

  // Let the browser set Content-Type for FormData (needs the boundary)
  if (!formHasFile(data)) {
    mergedHeaders["Content-Type"] = "application/json";
  }

  const body = buildBody(data);

  onStart?.();

  let res: Response | undefined;

  try {
    res = await fetch(url, {
      method,
      headers: mergedHeaders,
      body,
      redirect: "manual",
      ...(credentials !== undefined && { credentials }),
    });

    const response = await res.json();

    onComplete?.();

    if (!res.ok) {
      return Promise.reject<ResponseObject<T>>(
        buildError<T>(res.status, response?.data ?? response)
      );
    }

    return {
      status: "success",
      statusCode: res.status,
      data: (response?.message && response) ?? response?.data ?? response,
    };
  } catch (error) {
    onComplete?.();

    if (isResponseObject(error)) {
      return Promise.reject(error);
    }

    return Promise.reject<ResponseObject<T>>(
      buildError<T>(
        res?.status ?? 0,
        error instanceof Error ? error.message : "A network error occurred"
      )
    );
  }
}

/**
 * Thin wrapper around `fetch` with no response parsing.
 * Useful when you need the raw `Response` object.
 */
async function rawFetch(
  url: string,
  options: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { headers = {}, ...rest } = options;

  return fetch(url, {
    redirect: "manual",
    ...rest,
    headers: { accept: "application/json", ...headers },
  });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const http = { get, post, rawFetch };

export default http;
export { get, post, rawFetch };
