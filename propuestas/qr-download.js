/* Self-contained PNG export: brand fonts are rasterized, with no external assets. */
(() => {
  function imageFrom(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => reject(new Error('IMAGE_UNAVAILABLE')), 10000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('IMAGE_UNAVAILABLE')); };
      image.src = url;
    });
  }
  function rounded(ctx, x, y, width, height, radius, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
  }
  function fitText(ctx, text, maxWidth, size, family, weight = 500) {
    while (size > 22) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) return;
      size -= 2;
    }
  }
  async function download({ svg, business, testOnly }) {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const side = Number(clone.getAttribute('viewBox')?.split(/\s+/)[2]) || 1024;
    clone.setAttribute('width', String(side)); clone.setAttribute('height', String(side));
    const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    try {
      // Font loading is bounded so a font network failure cannot block the download.
      let timer;
      await Promise.race([
        Promise.all([document.fonts.load('500 110px Fredoka'), document.fonts.load('500 40px "Hanken Grotesk"')]).catch(() => {}),
        new Promise(resolve => { timer = setTimeout(resolve, 5000); })
      ]).finally(() => clearTimeout(timer));
      const [qr, logo] = await Promise.all([imageFrom(svgUrl), imageFrom('/assets/logo-mark.png')]);
      const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 2100;
      const ctx = canvas.getContext('2d');
      const plum = '#3E2B49', cream = '#F9F7EF', lime = '#CBDE2A';
      ctx.fillStyle = plum; ctx.fillRect(0, 0, 1600, 2100);
      rounded(ctx, 48, 48, 1504, 2004, 58, cream);
      rounded(ctx, 110, 113, 9, 56, 4, lime);
      ctx.fillStyle = plum;
      fitText(ctx, business, 1320, 42, '"Hanken Grotesk", sans-serif', 600);
      ctx.fillText(business, 146, 156);
      ctx.font = '500 114px Fredoka, sans-serif';
      ctx.fillText('Tu próxima visita', 110, 324);
      ctx.fillText('tiene premio.', 110, 446);
      ctx.font = '400 39px "Hanken Grotesk", sans-serif';
      ctx.fillStyle = '#6F6575'; ctx.fillText('Escanea y guarda tu tarjeta.', 114, 530);
      rounded(ctx, 140, 598, 1320, 1202, 44, '#FFFFFF');
      // Integer scaling preserves crisp square modules and the QR's quiet zone.
      const qrSide = side * Math.max(1, Math.floor(1100 / side));
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, Math.round((1600 - qrSide) / 2), Math.round(1150 - qrSide / 2), qrSide, qrSide);
      ctx.imageSmoothingEnabled = true;
      ctx.textAlign = 'center'; ctx.fillStyle = plum;
      ctx.font = '500 30px "Hanken Grotesk", sans-serif';
      ctx.fillText(testOnly ? 'Google Wallet · Tarjeta de prueba' : 'Tu tarjeta de recompensas', 800, 1752);
      ctx.strokeStyle = '#DDD5DF'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(112, 1850); ctx.lineTo(1488, 1850); ctx.stroke();
      ctx.textAlign = 'left';
      ctx.font = '400 28px "Hanken Grotesk", sans-serif';
      const labelWidth = ctx.measureText('Powered by').width;
      ctx.font = '500 65px Fredoka, sans-serif';
      const wordWidth = ctx.measureText('vuelveclub.').width;
      const start = (1600 - labelWidth - 26 - 66 - 14 - wordWidth) / 2;
      ctx.fillStyle = '#6F6575'; ctx.font = '400 28px "Hanken Grotesk", sans-serif';
      ctx.fillText('Powered by', start, 1941);
      ctx.drawImage(logo, start + labelWidth + 26, 1897, 66, 66);
      ctx.fillStyle = plum; ctx.font = '500 65px Fredoka, sans-serif';
      ctx.fillText('vuelveclub.', start + labelWidth + 106, 1950);
      ctx.textAlign = 'center'; ctx.fillStyle = '#817787';
      ctx.font = '400 24px "Hanken Grotesk", sans-serif';
      ctx.fillText(testOnly ? 'Solo para probar · Enlace válido por 24 horas desde su creación' : 'Registro de ejemplo · Programa en preparación', 800, 2010);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('EXPORT_UNAVAILABLE');
      const url = URL.createObjectURL(blob);
      const slug = business.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'negocio';
      const link = document.createElement('a'); link.href = url; link.download = `vuelveclub-qr-${slug}.png`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
    } finally { URL.revokeObjectURL(svgUrl); }
  }
  window.VuelveQRDownload = Object.freeze({ download });
})();
