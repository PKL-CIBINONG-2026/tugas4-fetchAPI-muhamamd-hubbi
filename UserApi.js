import { apiRequest } from "./api.js";

export class UserApi {
  list({ page, limit, search = "" }) {
    const query = new URLSearchParams({
      _page: String(page),
      _limit: String(limit),
    });
    if (search) query.set("search", search);
    return apiRequest(`/users?${query}`);
  }

  create(user) {
    return apiRequest("/users", { method: "POST", body: JSON.stringify(user) });
  }

  uploadImage(id, file){
	const form = new FormData();
	form.append('image', file);
	return apiRequest(`/users/${encodeURIComponent(id)}/avatar`, {
		method: "POST",
		body: form
	}, true)
  }

  deleteImage(id){
	return apiRequest(`/users/${encodeURIComponent(id)}/avatar`, {
		method: "DELETE"
	})
  }

  update(id, user) {
    return apiRequest(`/users/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(user),
    });
  }

  updatePreference(id, field, value) {
    return apiRequest(`/users/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        preferences: {
          [field]: value,
        },
      }),
    });
  }

  remove(id) {
    return apiRequest(`/users/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
