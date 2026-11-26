// Sesuaikan BASE_URL dengan yang tertera di portal https://pkl-cibinong-2026.github.io/mock-api/
const BASE_URL = "https://mock-api.pkl.local/api/v1";
// const BASE_URL = "https://pkl-cibinong-2026.github.io/mock-api/api/v1";

export async function apiRequest(endpoint, options = {}, isImage = false) {

  const isFormData = options.body instanceof FormData;
  const headers = {...options.headers};

  if (!isImage && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  })


  // 1. Tangani status 204 No Content (biasanya dari DELETE) & method HEAD
  if (response.status === 204 || options.method === "HEAD") {
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      data: null,
    };
  }


  // 2. Parse JSON response body
  const data = await response.json().catch(() => null);


  // 3. Lempar error terstruktur jika status HTTP bukan 2xx (misal 400, 404, 409, 422)
  if (!response.ok) {
    const error = new Error(data?.message || `HTTP Error ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }


  return {
    ok: true,
    status: response.status,
    headers: response.headers,
    data,
  };
}
