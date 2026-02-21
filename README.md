# oku

A lightweight, framework-agnostic HTTP client built on the native `fetch` API.

## Features

- **Promise-based error handling** — rejects on non-2xx responses and network failures, so you use standard `try/catch` or `.catch()`.
- **Lifecycle hooks** — `onStart` and `onComplete` let you wire in any loading state, spinner, or analytics logic you already have.
- **Automatic body serialisation** — `post` detects `File` / `FileList` values and switches between `JSON.stringify` and `FormData` automatically.
- **Bring-your-own headers** — no cookies, XSRF tokens, or auth headers are injected. Pass exactly what you need.
- **TypeScript-first** — all options and return types are fully typed and generic.

---

## When to use oku

oku is a good fit when:

- **You want fetch without the boilerplate.** You need JSON serialisation, consistent error handling, and typed responses — but not a heavy dependency like axios with its interceptor pipeline and adapter system.
- **You're building framework-agnostic code.** oku has zero runtime dependencies and works in React, Vue, Svelte, SolidJS, vanilla JS, or any environment that supports the native `fetch` API (browsers, Node.js 18+, Deno, Bun).
- **You need predictable error handling.** Non-2xx responses reject the promise just like network failures, so every error flows through one `catch` path — no need to manually inspect `response.ok`.
- **You upload files alongside JSON data.** oku detects `File`/`FileList` values automatically and switches to `FormData`, so you never have to set `Content-Type` or build a `FormData` object yourself.
- **You want loading state hooks without a global store.** `onStart` and `onComplete` callbacks let you wire spinners, progress bars, or analytics into any request without coupling to a specific state library.
- **You're working without a bundler.** The IIFE build loads directly from a CDN `<script>` tag and exposes everything on a global, making it usable in plain HTML pages and browser extensions.
- **You need TypeScript generics on the response.** Pass a type argument to `get<T>` or `post<T>` and the `data` field is typed automatically — no casting required.

oku is **not** the right tool when you need request cancellation (`AbortController` wiring), automatic retry logic, request deduplication, or a full interceptor pipeline. Reach for a more full-featured client (or your framework's data-fetching layer) in those cases.

---

## Installation

### npm / yarn / pnpm

```bash
npm install @sirmekus/oku
# or
yarn add @sirmekus/oku
# or
pnpm add @sirmekus/oku
```

### Script tag (CDN, no bundler required)

Include the IIFE build from [unpkg](https://unpkg.com) or [jsDelivr](https://www.jsdelivr.com). All methods are available on the global `HttpClient` variable.

```html
<!-- unpkg (latest) -->
<script src="https://unpkg.com/@sirmekus/oku/dist/index.global.js"></script>

<!-- jsDelivr (latest) -->
<script src="https://cdn.jsdelivr.net/npm/@sirmekus/oku/dist/index.global.js"></script>

<!-- Pin to a specific version (recommended for production) -->
<script src="https://unpkg.com/@sirmekus/oku@1.0.0/dist/index.global.js"></script>
```

Once the script is loaded, use `HttpClient` directly - no `import` or bundler needed:

```html
<script src="https://unpkg.com/@sirmekus/oku/dist/index.global.js"></script>
<script>
  HttpClient.get({ url: '/api/users' })
    .then(function (res) {
      console.log(res.data);
    })
    .catch(function (err) {
      console.error(err.statusCode, err.data);
    });

  // Or with async/await (modern browsers)
  async function loadUsers() {
    try {
      const res = await HttpClient.get({ url: '/api/users' });
      console.log(res.data);
    } catch (err) {
      console.error(err.statusCode, err.data);
    }
  }
</script>
```

> **ESM alternative** — if your page already uses `<script type="module">` you can import the ESM build directly from the CDN instead:
>
> ```html
> <script type="module">
>   import http from 'https://unpkg.com/@sirmekus/oku/dist/index.mjs';
>
>   const res = await http.get({ url: '/api/users' });
>   console.log(res.data);
> </script>
> ```

---

## API Reference

### `get<T>(options: GetOptions): Promise<ResponseObject<T>>`

Performs a GET request.

**Resolves** with a `ResponseObject<T>` on a 2xx response.
**Rejects** with a `ResponseObject<T>` on a non-2xx response or network failure.

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | — | The request URL. |
| `headers` | `Record<string, string>` | No | `{}` | Headers merged on top of `{ accept: "application/json" }`. |
| `onStart` | `() => void` | No | — | Called immediately before the request is sent. |
| `onComplete` | `() => void` | No | — | Called after the request settles (success or failure). |
| `returnEntireResponse` | `boolean` | No | `false` | When `true`, `data` is the full parsed response body. When `false`, `data` is `response.data ?? response`. |

---

### `post<T>(options: PostOptions): Promise<ResponseObject<T>>`

Performs a POST, PUT, PATCH, or DELETE request.

**Resolves** with a `ResponseObject<T>` on a 2xx response.
**Rejects** with a `ResponseObject<T>` on a non-2xx response or network failure.

| Option | Type | Required | Default | Description |
|---|---|---|---|---|
| `url` | `string` | Yes | — | The request URL. |
| `headers` | `Record<string, string>` | No | `{}` | Headers merged on top of defaults. Do **not** set `Content-Type` manually for file uploads — the browser sets it with the correct boundary. |
| `onStart` | `() => void` | No | — | Called immediately before the request is sent. |
| `onComplete` | `() => void` | No | — | Called after the request settles (success or failure). |
| `data` | `Record<string, any>` | No | `{}` | Request payload. Serialised to `FormData` if any value is a `File` or `FileList`, otherwise `JSON.stringify`'d. |
| `method` | `"POST" \| "PUT" \| "PATCH" \| "DELETE"` | No | `"POST"` | HTTP method. |

---

### `rawFetch(url, options?): Promise<Response>`

A thin wrapper around native `fetch`. Returns the raw `Response` object with no parsing applied. Useful for streaming, blob downloads, or any case where you need full control over the response.

| Parameter | Type | Description |
|---|---|---|
| `url` | `string` | The request URL. |
| `options` | `RequestInit & { headers?: Record<string, string> }` | Standard `fetch` init options. `headers` are merged on top of `{ accept: "application/json" }`. |

---

### `ResponseObject<T>`

The shape returned (or rejected with) by `get` and `post`.

```ts
interface ResponseObject<T = any> {
  status: "success" | "error";
  statusCode: number;   // HTTP status code, or 0 for network-level failures
  data: T;
}
```

---

## Usage Examples

### Basic GET

```ts
import http from '@sirmekus/oku';

const res = await http.get({ url: '/api/users' });
console.log(res.data); // the response payload
```

---

### Handling errors

Errors reject the promise, so handle them with `try/catch` or `.catch()`.

```ts
import http, { ResponseObject } from '@sirmekus/oku';

try {
  const res = await http.get({ url: '/api/users/99' });
  console.log(res.data);
} catch (err) {
  const error = err as ResponseObject;
  console.error(error.statusCode); // e.g. 404
  console.error(error.data);       // server error body
}
```

---

### Wiring up loading state

Pass `onStart` and `onComplete` to hook into any state management or UI you already have.

```ts
// useState
const [loading, setLoading] = useState(false);

const res = await http.get({
  url: '/api/orders',
  onStart: () => setLoading(true),
  onComplete: () => setLoading(false),
});

// Zustand
import { useLoadingStore } from '@/stores/loadingStore';
const { setLoading } = useLoadingStore.getState();

await http.post({
  url: '/api/orders',
  data: { item: 'book' },
  onStart: () => setLoading(true),
  onComplete: () => setLoading(false),
});
```

---

### Global loading state via document events

If multiple parts of your app make requests independently, passing `onStart`/`onComplete` callbacks everywhere can be repetitive. An alternative is to dispatch [CustomEvents](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent) on the `document` and listen for them in one central place — keeping requests fully decoupled from your loading UI.

**Step 1 — register the listeners once** (e.g. in your app bootstrap or a layout component):

```js
document.addEventListener('http:start', () => {
  document.getElementById('global-spinner').style.display = 'block';
});

document.addEventListener('http:complete', () => {
  document.getElementById('global-spinner').style.display = 'none';
});
```

**Step 2 — dispatch the events per request:**

```js
const httpEvents = {
  onStart:    () => document.dispatchEvent(new CustomEvent('http:start')),
  onComplete: () => document.dispatchEvent(new CustomEvent('http:complete')),
};

// Spread into any request — no extra code needed at the call site
const res = await http.get({ url: '/api/users', ...httpEvents });
```

You can also pass arbitrary detail in the event payload:

```js
document.addEventListener('http:complete', (e) => {
  console.log('Request finished:', e.detail.url, e.detail.statusCode);
});

await http.get({
  url: '/api/orders',
  onStart: () =>
    document.dispatchEvent(new CustomEvent('http:start', { detail: { url: '/api/orders' } })),
  onComplete: () =>
    document.dispatchEvent(new CustomEvent('http:complete', { detail: { url: '/api/orders', statusCode: 200 } })),
});
```

> This pattern works in any environment — vanilla JS, React, Vue, Svelte, or a plain HTML page loaded via `<script>` tag.

---

### Injecting auth headers

```ts
const token = getAuthToken(); // your own logic

const res = await http.get({
  url: '/api/profile',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

### POST with JSON

```ts
const res = await http.post({
  url: '/api/login',
  data: { email: 'user@example.com', password: 'secret' },
});
```

---

### PUT / PATCH / DELETE

```ts
await http.post({
  url: '/api/users/42',
  method: 'PUT',
  data: { name: 'Jane Doe' },
});

await http.post({
  url: '/api/users/42',
  method: 'DELETE',
});
```

---

### File upload

Any `File` or `FileList` value in `data` triggers automatic `FormData` serialisation. Do **not** set `Content-Type` manually — the browser must set it so the multipart boundary is included.

```ts
// Single file
await http.post({
  url: '/api/avatar',
  data: { avatar: fileInput.files[0] },
});

// Multiple files under the same key
await http.post({
  url: '/api/attachments',
  data: { files: fileInput.files }, // FileList
});

// Mixed payload
await http.post({
  url: '/api/documents',
  data: {
    title: 'My Report',
    category: 'finance',
    file: fileInput.files[0],
  },
});
```

---

### Raw fetch

Use `rawFetch` when you need the native `Response` object, e.g. for blob downloads or streaming.

```ts
import { rawFetch } from '@sirmekus/oku';

const res = await rawFetch('/api/export/csv', {
  headers: { Authorization: `Bearer ${token}` },
});
const blob = await res.blob();
```

---

### Typing the response

Pass a type argument to get a typed `data` field.

```ts
interface User {
  id: number;
  name: string;
  email: string;
}

const res = await http.get<User>({ url: '/api/users/1' });
// res.data is now typed as User
console.log(res.data.name);
```

---

## Notes

- `accept: application/json` is always set. Override it by passing your own `accept` key in `headers`.
- `Content-Type` is set to `application/json` automatically for non-file POST payloads. For `FormData` payloads it is intentionally omitted so the browser can include the multipart boundary.
- All requests use `redirect: "manual"`. Redirects are not followed automatically.
- No credentials, cookies, or XSRF tokens are handled. Inject them via `headers` if needed.
- A `statusCode` of `0` in a rejected `ResponseObject` indicates a network-level failure (e.g. no internet, DNS failure) where no HTTP response was received.
