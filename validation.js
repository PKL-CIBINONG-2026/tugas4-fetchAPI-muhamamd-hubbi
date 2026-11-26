const IMAGE_SIGNATURES = [
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
];

export function isValidPhoneNumber(iti) {
  return Boolean(iti?.isValidNumber());
}

export function normalizePhonePrefix(input, iti) {
  if (!input.value.startsWith("0") || !iti) return;
  const country = iti.getSelectedCountry();
  if (!country?.dialCode) return;
  const digits = input.value.replace(/\D/g, "").slice(1);
  iti.setNumber(`+${country.dialCode}${digits}`);
}

export function isImage(url, timeout = 10000) {
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
    const timeoutId = setTimeout(() => finish(false), timeout);
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => finish(false);
    img.src = parsedUrl.href;
  });
}

export async function verifyImageFile(file) {
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
      : { valid: false, reason: tooLarge ? "dimension_too_large" : "zero_dimension" };
  } catch {
    return { valid: false, reason: "decode_failed" };
  }
}
