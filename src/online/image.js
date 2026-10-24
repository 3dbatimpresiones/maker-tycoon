// Achica una foto en el navegador antes de guardarla (para que pese pocos KB).
//   mode 'cover': recorta al centro para llenar w×h (foto de perfil cuadrada)
//   mode 'contain': entra entera, como mucho w×h (imagen del cartel)
export function imageToDataUrl(file, { w = 96, h = 96, mode = 'cover', quality = 0.78, maxBytes = 22000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error('Elegí una imagen (JPG, PNG o WEBP).')); return; }
    if (file.size > 15 * 1024 * 1024) { reject(new Error('La imagen es muy pesada (máximo 15 MB).')); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let sx = 0, sy = 0, sw = img.width, sh = img.height, cw = w, ch = h;
      if (mode === 'cover') {
        const k = Math.max(w / img.width, h / img.height);
        sw = w / k; sh = h / k; sx = (img.width - sw) / 2; sy = (img.height - sh) / 2;
      } else {
        const k = Math.min(1, w / img.width, h / img.height);
        cw = Math.max(1, Math.round(img.width * k)); ch = Math.max(1, Math.round(img.height * k));
      }
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d');
      x.fillStyle = '#131D47'; x.fillRect(0, 0, cw, ch); // fondo para PNG con transparencia
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
      let q = quality, out = c.toDataURL('image/jpeg', q);
      while (out.length > maxBytes && q > 0.35) { q -= 0.08; out = c.toDataURL('image/jpeg', q); }
      if (out.length > maxBytes) { reject(new Error('No pude achicar la imagen lo suficiente. Probá con otra.')); return; }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer esa imagen.')); };
    img.src = url;
  });
}
