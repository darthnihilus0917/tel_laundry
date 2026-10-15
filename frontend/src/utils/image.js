// Client-side compression for every photo upload (bag photo, payment receipt, issue photos):
// resize to max 1080px wide and step JPEG quality down until it is under ~2MB.
const MAX_WIDTH = 1080;
const MAX_BYTES = 2 * 1024 * 1024;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function compressImage(file) {
  const original = await readAsDataURL(file);
  try {
    const img = await loadImage(original);
    const scale = Math.min(1, MAX_WIDTH / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.85;
    let out = canvas.toDataURL("image/jpeg", quality);
    while (out.length * 0.75 > MAX_BYTES && quality > 0.35) {
      quality -= 0.1;
      out = canvas.toDataURL("image/jpeg", quality);
    }
    return out;
  } catch {
    return original; // not decodable as an image — keep as-is
  }
}
