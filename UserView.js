import { getPaginationItems } from "./pagination.js";

const defaultAvatar = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4Ij48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iI2VkZjFmOCIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTciIHI9IjciIGZpbGw9IiM5MGEwYWYiLz48cGF0aCBkPSJNNiA0MmMxLTkgNy0xNCAxOC0xNHMxNyA1IDE4IDE0IiBmaWxsPSIjOTBhMGFmIi8+PC9zdmc+";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function safeAvatarUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export class UserView {
  constructor() {
    this.container = document.getElementById("user-container");
    this.tableView = document.getElementById("table-view");
    this.gridView = document.getElementById("grid-view");
    this.pagination = document.getElementById("pagination");
  }

  showMessage(title, text, icon = "success", options = {}) {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: "OK",
      heightAuto: false,
      scrollbarPadding: false,
      target: document.body,
      customClass: { container: "user-swal-container" },
      didOpen: () => document.body.classList.add("modal-open"),
      willClose: () => {
        if (!document.querySelector("dialog[open]"))
          document.body.classList.remove("modal-open");
      },
      ...options,
    });
  }

  setLoading(limit) {
    this.pagination.classList.add("is-loading");
    this.container.innerHTML = Array.from(
      { length: limit },
      (_, index) => `
			<tr class="loading-row${index === 0 ? " loading-row-first" : ""}">
				<td colspan="11">${index === 0 ? "Loading users..." : ""}</td>
			</tr>`,
    ).join("");
    this.gridView.innerHTML = '<p class="loading-state">Loading users...</p>';
  }

  setPagination({ page, limit, totalCount, userCount }) {
    const hasNextPage = Number.isFinite(totalCount)
      ? page * limit < totalCount
      : userCount === limit;
    const totalPages = Number.isFinite(totalCount)
      ? Math.max(1, Math.ceil(totalCount / limit))
      : page + (hasNextPage ? 1 : 0);

    this.pagination.querySelector('[data-action="prev"]').disabled = page <= 1;

    this.pagination.querySelector('[data-action="next"]').disabled =
      Number.isFinite(totalCount) ? page >= totalPages : !hasNextPage;

    const pageItems = getPaginationItems(page, totalPages, 5).map((item) =>
      item === "ellipsis"
        ? '<span class="pagination-ellipsis" aria-label="Pages omitted">…</span>'
        : `<button type="button" class="pagination-button${item === page ? " active" : ""}" data-action="page-goto" data-page="${item}" ${item === page ? 'aria-current="page"' : ""} aria-label="Page ${item}">${item}</button>`,
    );

    const pageContainer = document.getElementById("pagination-page");
    pageContainer.innerHTML = pageItems.join("");
      pageContainer.setAttribute("aria-label", "Pagination pages");

  }

  async renderUsers(users, limit) {
    const tableRows = users
      .map((user) => {
        const id = escapeHtml(user.id);
        const name = escapeHtml(user.fullName);
        const avatar = escapeHtml(safeAvatarUrl(user.avatarUrl) || defaultAvatar);
        const themeClass =
          user.preferences?.theme === "dark" ? "is-dark" : "is-light";
        return `<tr>
									<td class="secondary-column">${id}</td><td>${name}</td>
									<td><a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></td>
									<td>${escapeHtml(user.phone)}</td><td>${escapeHtml(user.bio ?? "-")}</td>
									<td>${escapeHtml(user.address ?? "-")}</td>
									<td class="secondary-column">${avatar ? `<img class="avatar" src="${avatar}" alt="Avatar ${name}">` : "-"}</td>
									<td>${this.themeSwitch(user, themeClass)}</td>
									<td>
                    <label class="table-status">
                      <input type="checkbox" data-id="${id}" data-field="twoFactorEnabled" ${user.preferences?.twoFactorEnabled === true ? "checked" : ""}>
                    </label>
                  </td>
									<td>
                    <label class="table-status">
                      <input type="checkbox" data-id="${id}" data-field="emailNotifications" ${user.preferences?.emailNotifications === true ? "checked" : ""}>
                    </label>
                  </td>
									<td class="actions">
                    <button type="button" data-action="edit" data-id="${id}">Edit</button>
                    <button type="button" data-action="delete" data-id="${id}">Delete</button>
                  </td>
								</tr>`;
      })
      .join("");
    const emptyRows = Array.from(
      { length: Math.max(0, limit - users.length) },
      () => '<tr class="empty-row"><td colspan="11"></td></tr>',
    ).join("");
    const noUsers =
      '<tr class="empty-state"><td colspan="11">No users found.</td></tr>' +
      Array.from(
        { length: limit - 1 },
        () => '<tr class="empty-row"><td colspan="11"></td></tr>',
      ).join("");
    this.container.innerHTML = users.length ? tableRows + emptyRows : noUsers;

    this.gridView.innerHTML =
      users
        .map((user) => {
          const id = escapeHtml(user.id);
          const name = escapeHtml(user.fullName);
          const avatar = escapeHtml(safeAvatarUrl(user.avatarUrl) || defaultAvatar);
          return `
					<article class="user-card">
						<img class="avatar" src="${avatar}" alt="Avatar ${name}">
						<h2>${name}</h2>
						<p><strong>Email:</strong> <a href="mailto:${escapeHtml(user.email)}">${escapeHtml(user.email)}</a></p>
						<p><strong>Phone:</strong> ${escapeHtml(user.phone)}</p>
						<div class="card-profile">
              <p>
                <strong>Bio</strong>
                <span>${escapeHtml(user.bio ?? "—")}</span>
              </p>
              <p>
                <strong>Address</strong>
                <span>${escapeHtml(user.address ?? "—")}</span></p></div>
						<div class="card-settings">
							<div class="card-setting">
                <strong>Theme</strong>
                ${this.themeSwitch(user, user.preferences?.theme === "dark" ? "is-dark" : "is-light")}
              </div>
							<label class="card-setting">
                <span>2FA</span>
                <span class="card-control">
                  <input type="checkbox" data-id="${id}" data-field="twoFactorEnabled" ${user.preferences?.twoFactorEnabled === true ? "checked" : ""}>
                </span>
              </label>
							<label class="card-setting"><span>Email notifications</span><span class="card-control"><input type="checkbox" data-id="${id}" data-field="emailNotifications" ${user.preferences?.emailNotifications === true ? "checked" : ""}></span></label>
						</div>
						<div class="actions"><button type="button" data-action="edit" data-id="${id}">Edit</button><button type="button" data-action="delete" data-id="${id}">Delete</button></div>
					</article>`;
        })
        .join("") || '<p class="loading-state">No users found.</p>';

    const avatarImages = [
      ...this.container.querySelectorAll("img.avatar"),
      ...this.gridView.querySelectorAll("img.avatar"),
    ];
    avatarImages.forEach((img) => {
      const useFallback = () => {
        if (img.dataset.fallbackApplied === "true") return;
        img.dataset.fallbackApplied = "true";
        img.src = defaultAvatar;
      };

      if (img.complete) {
        if (img.naturalWidth === 0) useFallback();
        return;
      }

      img.addEventListener("error", useFallback, { once: true });
      img.addEventListener("load", () => {
        if (img.naturalWidth === 0) useFallback();
      }, { once: true });
    });
  }

  themeSwitch(user, themeClass) {
    return `<button type="button" class="theme-switch ${themeClass}" data-id="${escapeHtml(user.id)}" data-field="theme" title="Switch theme for ${escapeHtml(user.fullName)}"><span class="switch-knob"><svg class="sun-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg><svg class="moon-icon" viewBox="0 0 24 24"><path d="M20.2 15.3A8.5 8.5 0 0 1 8.7 3.8 8.6 8.6 0 1 0 20.2 15.3Z"/></svg></span></button>`;
  }

  setPreferenceControl(control, field, value) {
    if (field === "theme") {
      control.classList.toggle("is-dark", value === "dark");
      control.classList.toggle("is-light", value === "light");
    } else {
      control.checked = value;
      const status = control
        .closest(".table-status, .card-control")
        ?.querySelector("span, small");
    }
  }


  setView(view) {
    const showTable = view === "table";
    this.tableView.hidden = !showTable;
    this.gridView.hidden = showTable;
    document
      .getElementById("table-view-button")
      .classList.toggle("active", showTable);
    document
      .getElementById("grid-view-button")
      .classList.toggle("active", !showTable);
  }
}
