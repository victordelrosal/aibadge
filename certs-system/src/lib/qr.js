// qr.js — render a QR code to a crisp SVG string. Pure JS (qrcode-generator),
// runs identically in Node and in the Worker bundle.
import qrcode from "qrcode-generator";

// Returns an SVG string sized to `size` px, `fg`/`bg` colours, with a quiet zone.
export function qrSvg(text, { size = 240, fg = "#0b1440", bg = "transparent", margin = 4, ecl = "M" } = {}) {
  const qr = qrcode(0, ecl);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const total = count + margin * 2;
  let path = "";
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        path += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
  }
  const bgRect = bg === "transparent" ? "" : `<rect width="${total}" height="${total}" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${bgRect}<path d="${path}" fill="${fg}"/></svg>`;
}

// Convenience: QR as a data URI (for <img src> or CSS).
export function qrDataUri(text, opts) {
  const svg = qrSvg(text, opts);
  return "data:image/svg+xml;base64," + base64(svg);
}

function base64(str) {
  if (typeof btoa === "function") return btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, "utf8").toString("base64");
}
