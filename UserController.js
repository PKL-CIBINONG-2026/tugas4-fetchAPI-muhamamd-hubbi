export class UserController {
  constructor(api, view) {
    this.api = api;
    this.view = view;
    this.users = [];
    this.page = 1;
    this.limit = 8;
    this.search = "";
    this.searchTimer = null;
    this.editingUserId = null;
    this.createDialog = document.getElementById("create-dialog");
    this.createForm = document.getElementById("create-form");
    this.editDialog = document.getElementById("edit-dialog");
    this.editForm = document.getElementById("edit-form");
    this.pagination = document.getElementById("pagination");
    this.searchInput = document.getElementById("user-search");
    this.phoneInputs = new Map();
    const urlParams = new URLSearchParams(window.location.search);
    this.search = urlParams.get("search")?.trim() ?? "";
    this.searchInput.value = this.search;
    const urlPage = Number(urlParams.get("page"));
    if (Number.isInteger(urlPage) && urlPage > 0) this.page = urlPage;
    if (this.searchInput) this.searchInput.value = this.search;
  }

  async render() {
    this.view.setLoading(this.limit);
    try {
      const { data, headers } = await this.api.list({
        page: this.page,
        limit: this.limit,
        search: this.search,
      });
      this.users = Array.isArray(data) ? data : [];
      if (!this.users.length && this.page > 1) {
        this.page -= 1;
        return this.render();
      }
      const countHeader = headers?.get?.("x-total-count") ?? null;
      const totalCount = countHeader?.trim() ? Number(countHeader) : null;
      this.view.setPagination({
        page: this.page,
        limit: this.limit,
        totalCount,
        userCount: this.users.length,
      });
      this.syncPageToUrl();
      await this.view.renderUsers(this.users, this.limit);
    } catch (error) {
      this.view.showMessage(
        "Error",
        `Failed to load users: ${error.message}`,
        "error",
      );
      this.users = [];
      await this.view.renderUsers([], this.limit);
      this.view.setPagination({
        page: this.page,
        limit: this.limit,
        totalCount: 0,
        userCount: 0,
      });
      this.syncPageToUrl();
    } finally {
      this.pagination.classList.remove("is-loading");
    }
  }

  bindEvents() {
    this.initializePhoneInputs();
    document.getElementById("add-user").addEventListener("click", () => {
      this.createForm.reset();
      this.createDialog.showModal();
      this.lockScroll();
    });
    document
      .getElementById("cancel-form")
      .addEventListener("click", () => this.createDialog.close());
    document
      .getElementById("cancel-edit-form")
      .addEventListener("click", () => this.editDialog.close());
    for (const dialog of [this.createDialog, this.editDialog])
      dialog.addEventListener("close", () => this.unlockScroll());

    this.view.container.addEventListener("click", (event) =>
      this.handleThemeToggle(event),
    );
    this.view.gridView.addEventListener("click", (event) =>
      this.handleThemeToggle(event),
    );
    this.view.container.addEventListener("change", (event) =>
      this.handlePreferenceChange(event),
    );
    this.view.gridView.addEventListener("change", (event) =>
      this.handlePreferenceChange(event),
    );
    this.view.container.addEventListener("click", (event) =>
      this.handleUserAction(event),
    );
    this.view.gridView.addEventListener("click", (event) =>
      this.handleUserAction(event),
    );
    this.pagination.addEventListener("click", (event) =>
      this.handlePagination(event),
    );
    this.createForm.addEventListener("submit", (event) =>
      this.createUser(event),
    );
    this.editForm.addEventListener("submit", (event) => this.updateUser(event));
    this.editForm.addEventListener("change", (event) => {
      if (event.target.name === "avatarMode") {
        this.setAvatarMode(this.editForm, event.target.value);
      }
      if (event.target.name === "avatarFile") {
        this.previewAvatarFile(this.editForm, event.target.files[0]);
      }
    });
    this.editForm.elements.namedItem("avatarUrl")?.addEventListener("input", (event) => {
      const url = event.target.value.trim();
      if (url) this.validateAvatarUrl(this.editForm, url);
      else this.setAvatarPreview(this.editForm, this.previousAvatarUrl || "");
    });

    this.searchInput?.addEventListener("input", () => {
      clearTimeout(this.searchTimer);
      this.search = this.searchInput.value.trim();
      this.searchTimer = setTimeout(() => {
        this.page = 1;
        this.render();
      }, 300);
    });

    const responsiveView = window.matchMedia("(max-width: 900px)");
    const applyResponsiveView = () =>
      this.view.setView(responsiveView.matches ? "grid" : "table");
    responsiveView.addEventListener("change", applyResponsiveView);
    document
      .getElementById("table-view-button")
      .addEventListener("click", () => {
        if (!responsiveView.matches) this.view.setView("table");
      });
    document
      .getElementById("grid-view-button")
      .addEventListener("click", () => {
        if (!responsiveView.matches) this.view.setView("grid");
      });
  }

  start() {
    this.bindEvents();
    this.render();
  }

  lockScroll() {
    document.body.classList.add("modal-open");
  }
  unlockScroll() {
    if (!document.querySelector("dialog[open]"))
      document.body.classList.remove("modal-open");
  }

  async handleUserAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const user = this.users.find(
      (item) => String(item.id) === button.dataset.id,
    );
    if (!user) return;
    if (button.dataset.action === "edit") {
      this.editingUserId = user.id;
      for (const field of [
        "fullName",
        "email",
        "bio",
        "address",
        "avatarUrl",
      ]) {
        this.editForm.elements.namedItem(field).value = user[field] ?? "";
      }
      this.phoneInputs.get(this.editForm.elements.namedItem("phone"))?.setNumber(user.phone ?? "");
      this.editForm.elements.namedItem("avatarFile").value = "";
      this.editForm.querySelector('input[name="avatarMode"][value="url"]').checked = true;
      this.previousAvatarUrl = user.avatarUrl ?? "";
      this.setAvatarPreview(this.editForm, this.previousAvatarUrl);
      if (this.previousAvatarUrl) this.validateAvatarUrl(this.editForm, this.previousAvatarUrl);
      this.setAvatarMode(this.editForm, "url");
      this.editDialog.showModal();
      this.lockScroll();
      return;
    }
    const result = await this.view.showMessage(
      "Are you sure?",
      "You won't be able to revert this!",
      "warning",
      {
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      },
    );
    if (!result.isConfirmed) return;
    button.disabled = true;
    button.textContent = "Deleting...";
    try {
      await this.api.remove(user.id);
      await this.view.showMessage("Deleted!", "User has been deleted.");
      await this.render();
    } catch (error) {
      button.disabled = false;
      button.textContent = "Delete";
      this.view.showMessage(
        "Error",
        `Failed to delete user: ${error.message}`,
        "error",
      );
    }
  }

  async createUser(event) {
    event.preventDefault();
    if (this.createSubmitting) return;
    const phone = await this.getPhoneNumber(this.createForm);
    if (!phone) return;
    this.createSubmitting = true;
    const submit = this.createForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Saving...";
    const form = new FormData(this.createForm);
    const payload = {
      fullName: form.get("fullName").trim(),
      email: form.get("email").trim(),
      phone,
    };
    try {
      const response = await this.api.create(payload);
      this.createDialog.close();
      this.page = 1;
      await this.view.showMessage("Added", "User added successfully.");
      await this.render();
    } catch (error) {
      this.view.showMessage(
        "Error",
        `Failed to create user: ${error.message}`,
        "error",
        { target: this.createDialog },
      );
    } finally {
      submit.disabled = false;
      submit.textContent = "Save";
      this.createSubmitting = false;
    }
  }

  async updateUser(event) {
    event.preventDefault();
    if (this.editSubmitting) return;
    const phone = await this.getPhoneNumber(this.editForm);
    if (!phone) return;
    this.editSubmitting = true;
    const mode = this.avatarMode(this.editForm);
    const avatarUrl = this.editForm.elements
      .namedItem("avatarUrl")
      .value.trim();
    const avatarFile = this.editForm.elements.namedItem("avatarFile").files[0];
    if (mode === "url" && avatarUrl && !(await this.isImage(avatarUrl))) {
      await this.view.showMessage(
        "Invalid image URL",
        "The avatar URL could not be loaded. Please enter a valid image URL and try again.",
        "error",
        { target: this.editDialog },
      );
      this.editForm.elements.namedItem("avatarUrl")?.focus();
      this.editSubmitting = false;
      return;
    }
    if (mode === "upload" && avatarFile) {
      const validation = await verifyImageFile(avatarFile);
      if (!validation.valid) {
        await this.showInvalidFile(this.editDialog, validation.reason);
        this.editForm.elements.namedItem("avatarFile").focus();
        this.editSubmitting = false;
        return;
      }
    }

    const submit = this.editForm.querySelector('[type="submit"]');
    submit.disabled = true;
    submit.textContent = "Saving...";
    const form = new FormData(this.editForm);
    const user = Object.fromEntries(
      ["fullName", "email", "bio"].map((key) => [
        key,
        form.get(key).trim(),
      ]),
    );
    user.phone = phone;
    user.address = form.get("address").trim() || null;
    if (mode === "url" && avatarUrl) user.avatarUrl = avatarUrl;
    else if (mode === "upload") user.avatarUrl = this.previousAvatarUrl || null;
    try {
      await this.api.update(this.editingUserId, user);
      if (mode === "upload" && avatarFile) {
        const uploadResponse = await this.api.uploadImage(
          this.editingUserId,
          avatarFile,
        );
        console.log("Upload image response:", uploadResponse.data);
        const uploadedAvatarUrl = uploadResponse.data?.avatarUrl;
        if (!uploadedAvatarUrl)
          throw new Error("Upload response did not include an avatar URL.");
        await this.api.update(this.editingUserId, {
          ...user,
          avatarUrl: uploadedAvatarUrl,
        });
      }
      this.editDialog.close();
      await this.view.showMessage("Updated", "User updated successfully.");
      await this.render();
    } catch (error) {
      this.view.showMessage(
        "Error",
        `Failed to update user: ${error.message}`,
        "error",
        { target: this.editDialog },
      );
    } finally {
      submit.disabled = false;
      submit.textContent = "Save";
      this.editSubmitting = false;
    }
  }

  async updatePreference(control, field, newValue) {
    const user = this.users.find(
      (item) => String(item.id) === control.dataset.id,
    );
    if (!user) return;
    const oldValue =
      field === "theme"
        ? (user.preferences?.theme ?? "light")
        : user.preferences?.[field] === true;
    user.preferences = { ...user.preferences, [field]: newValue };
    this.view.setPreferenceControl(control, field, newValue);
    control.disabled = true;
    try {
      await this.api.updatePreference(user.id, field, newValue);
    } catch (error) {
      user.preferences = { ...user.preferences, [field]: oldValue };
      this.view.setPreferenceControl(control, field, oldValue);
      await this.view.showMessage(
        "Error",
        `Failed to update preference: ${error.message}`,
        "error",
      );
    } finally {
      control.disabled = false;
    }
  }

  avatarMode(form) {
    return form.elements.namedItem("avatarMode").value;
  }

  bindAvatarMode(form) {
    form.addEventListener("change", (event) => {
      if (event.target.name === "avatarMode")
        this.setAvatarMode(form, event.target.value);
    });
  }

  setAvatarMode(form, mode) {
    const useUrl = mode === "url";
    for (const element of form.querySelectorAll("[data-avatar-url]"))
      element.hidden = !useUrl;
    for (const element of form.querySelectorAll("[data-avatar-file]"))
      element.hidden = useUrl;
    form.elements.namedItem("avatarUrl").disabled = !useUrl;
    form.elements.namedItem("avatarFile").disabled = useUrl;
    if (useUrl) form.elements.namedItem("avatarFile").value = "";
    else form.elements.namedItem("avatarUrl").value = "";
    if (useUrl) this.setAvatarPreview(form, form.elements.namedItem("avatarUrl").value.trim() || this.previousAvatarUrl || "");
  }

  initializePhoneInputs() {
    for (const form of [this.createForm, this.editForm]) {
      const input = form.elements.namedItem("phone");
      if (!input || this.phoneInputs.has(input)) continue;
      this.phoneInputs.set(input, window.intlTelInput(input, {
        initialCountry: "id",
        countrySelectorMode: "dropdown",
        separateDialCode: false,
        formatAsYouType: true,
        loadUtils: () => import("https://cdn.jsdelivr.net/npm/intl-tel-input@29.5.12/dist/js/utils.js"),
      }));
      input.addEventListener("input", () => this.normalizePhonePrefix(input, this.phoneInputs.get(input)));
    }
  }

  normalizePhonePrefix(input, iti) {
    if (!input.value.startsWith("0") || !iti) return;
    const selectedCountry = iti.getSelectedCountry();
    if (!selectedCountry?.dialCode) return;
    const dialCode = selectedCountry.dialCode;
    const digits = input.value.replace(/\D/g, "").slice(1);
    iti.setNumber(`+${dialCode}${digits}`);
  }

  async getPhoneNumber(form) {
    const input = form.elements.namedItem("phone");
    const iti = this.phoneInputs.get(input);
    if (iti?.promise) await iti.promise;
    if (!iti || !iti.isValidNumber()) {
      input.setCustomValidity("Enter a valid phone number for the selected country.");
      input.reportValidity();
      return null;
    }
    input.setCustomValidity("");
    return iti.getNumber();
  }

  setAvatarPreview(form, src) {
    const preview = form.querySelector(".avatar-form-preview");
    if (!preview) return;
    preview.hidden = !src;
    if (src) preview.src = src;
    else preview.removeAttribute("src");
  }

  async validateAvatarUrl(form, url) {
    const valid = await this.isImage(url);
    if (form.elements.namedItem("avatarUrl").value.trim() !== url) return;
    this.setAvatarPreview(form, valid ? url : (this.previousAvatarUrl || ""));
  }

  async previewAvatarFile(form, file) {
    if (form._avatarPreviewUrl) URL.revokeObjectURL(form._avatarPreviewUrl);
    if (!file) {
      this.setAvatarPreview(form, this.previousAvatarUrl ?? "");
      return;
    }
    const validation = await verifyImageFile(file);
    if (!validation.valid) {
      this.setAvatarPreview(form, this.previousAvatarUrl ?? "");
      await this.showInvalidFile(this.editDialog, validation.reason);
      form.elements.namedItem("avatarFile").value = "";
      return;
    }
    form._avatarPreviewUrl = URL.createObjectURL(file);
    this.setAvatarPreview(form, form._avatarPreviewUrl);
  }

  async showInvalidFile(dialog, reason) {
    const messages = {
      empty_or_invalid_blob: "Please choose an image file.",
      invalid_magic_bytes: "Choose a PNG, JPEG, WebP, or GIF image.",
      file_too_large: "Image must be 2 MB or smaller.",
      dimension_too_large:
        "Image dimensions must not exceed 8192 × 8192 pixels.",
      zero_dimension: "The image has invalid dimensions.",
      decode_failed: "This file could not be read as an image.",
    };
    await this.view.showMessage(
      "Invalid image",
      messages[reason] ?? "Please choose a valid image file.",
      "error",
      { target: dialog },
    );
  }

  handleThemeToggle(event) {
    const control = event.target.closest('[data-field="theme"]');
    if (!control || control.disabled) return;
    const user = this.users.find(
      (item) => String(item.id) === control.dataset.id,
    );
    if (!user) return;
    this.updatePreference(
      control,
      "theme",
      (user.preferences?.theme ?? "light") === "dark" ? "light" : "dark",
    );
  }

  handlePreferenceChange(event) {
    const control = event.target;
    const field = control.dataset.field;
    if (
      !field ||
      field === "theme" ||
      control.type !== "checkbox" ||
      control.disabled
    )
      return;
    this.updatePreference(control, field, control.checked);
  }

  async handlePagination(event) {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    if (button.dataset.action === "next") this.page += 1;
    else if (button.dataset.action === "prev" && this.page > 1) this.page -= 1;
    else if (button.dataset.action === "page-goto") {
      const targetPage = Number(button.dataset.page);
      if (
        !Number.isInteger(targetPage) ||
        targetPage < 1 ||
        targetPage === this.page
      )
        return;
      this.page = targetPage;
    } else return;
    this.syncPageToUrl();
    await this.render();
  }

  syncPageToUrl() {
    const url = new URL(window.location.href);
    if (this.page > 1) url.searchParams.set("page", String(this.page));
    else url.searchParams.delete("page");
    if (this.search) url.searchParams.set("search", this.search);
    else url.searchParams.delete("search");
    window.history.replaceState(null, "", url);
  }

  isImage(url) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(result);
      };

      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch {
        resolve(false);
        return;
      }

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        resolve(false);
        return;
      }

      const img = new Image();
      const timeoutId = setTimeout(() => finish(false), 10000);
      img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
      img.onerror = () => finish(false);
      img.src = parsedUrl.href;
    });
  }
}

const IMAGE_SIGNATURES = [
  {
    type: "image/png",
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
];

async function verifyImageFile(file) {
  if (!file || file.size === 0)
    return { valid: false, reason: "empty_or_invalid_blob" };
  if (file.size > 2 * 1024 * 1024)
    return { valid: false, reason: "file_too_large" };

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches = (signature, offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte);
  const standardImage = IMAGE_SIGNATURES.some(({ bytes: signature }) =>
    matches(signature),
  );
  const webpImage =
    matches([0x52, 0x49, 0x46, 0x46]) && matches([0x57, 0x45, 0x42, 0x50], 8);
  if (!standardImage && !webpImage)
    return { valid: false, reason: "invalid_magic_bytes" };

  try {
    const image = await createImageBitmap(file);
    const tooLarge = image.width > 8192 || image.height > 8192;
    const valid = image.width > 0 && image.height > 0 && !tooLarge;
    image.close();
    return valid
      ? { valid: true }
      : {
          valid: false,
          reason: tooLarge ? "dimension_too_large" : "zero_dimension",
        };
  } catch {
    return { valid: false, reason: "decode_failed" };
  }
}
