function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeAssetUrl(value, fallback) {
  try {
    const url = new URL(value || fallback);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}

function landingTemplate(manifest, manifestUrl) {
  const name = escapeHtml(manifest.name);
  const version = escapeHtml(manifest.version || '0.0.0');
  const description = escapeHtml(manifest.description || 'Türkçe altyazıları Stremio ile buluşturur.');
  const contactEmail = escapeHtml(manifest.contactEmail || '');
  const logo = safeAssetUrl(manifest.logo, '/images/logo.png');
  const background = safeAssetUrl(manifest.background, '/images/background.webp');
  const stremioUrl = manifestUrl.replace(/^https?:\/\//, 'stremio://');
  const serializedManifestUrl = JSON.stringify(manifestUrl).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#111827">
  <meta name="description" content="${description}">
  <title>${name} · Stremio Eklentisi</title>
  <link rel="icon" href="${escapeHtml(logo)}">
  <style>
    :root {
      color-scheme: dark;
      --ink: #f8fafc;
      --muted: #a8b3c7;
      --panel: rgba(12, 18, 32, .78);
      --panel-border: rgba(255, 255, 255, .12);
      --brand: #9b87f5;
      --brand-strong: #7c5ce7;
      --accent: #44d7b6;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      min-height: 100vh;
      margin: 0;
      color: var(--ink);
      background:
        linear-gradient(115deg, rgba(4, 7, 15, .96), rgba(13, 18, 33, .80) 55%, rgba(25, 16, 47, .88)),
        url("${escapeHtml(background)}") center / cover fixed;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.6;
    }
    a { color: inherit; }
    button, .button { font: inherit; }
    .shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
    .nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 84px;
    }
    .brand { display: flex; align-items: center; gap: 13px; text-decoration: none; font-weight: 750; }
    .brand img { width: 44px; height: 44px; border-radius: 12px; box-shadow: 0 12px 30px rgba(0,0,0,.28); }
    .tag {
      border: 1px solid var(--panel-border);
      border-radius: 999px;
      padding: 6px 11px;
      color: var(--muted);
      background: rgba(255,255,255,.05);
      font-size: 13px;
    }
    main { padding: 54px 0 72px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, .75fr); gap: 58px; align-items: center; }
    .hero > * { min-width: 0; }
    .eyebrow { color: var(--accent); font-size: 13px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
    h1 { max-width: 760px; margin: 12px 0 22px; font-size: clamp(42px, 7vw, 76px); line-height: 1.02; letter-spacing: -.045em; }
    .lead { max-width: 680px; margin: 0; color: #cbd5e1; font-size: clamp(18px, 2.1vw, 22px); }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
    .button {
      display: inline-flex;
      min-height: 52px;
      align-items: center;
      justify-content: center;
      gap: 9px;
      border: 1px solid transparent;
      border-radius: 14px;
      padding: 12px 20px;
      cursor: pointer;
      text-decoration: none;
      font-weight: 760;
      transition: transform .16s ease, background .16s ease, border-color .16s ease;
    }
    .button:hover { transform: translateY(-2px); }
    .button:focus-visible { outline: 3px solid rgba(155,135,245,.45); outline-offset: 3px; }
    .button.primary { background: linear-gradient(135deg, var(--brand), var(--brand-strong)); box-shadow: 0 18px 42px rgba(124,92,231,.28); }
    .button.secondary { border-color: var(--panel-border); background: rgba(255,255,255,.06); color: #e2e8f0; }
    .install-card, .feature {
      border: 1px solid var(--panel-border);
      background: var(--panel);
      box-shadow: 0 30px 80px rgba(0,0,0,.28);
      backdrop-filter: blur(18px);
    }
    .install-card { padding: 28px; border-radius: 24px; }
    .install-card img { width: 76px; height: 76px; border-radius: 20px; }
    .install-card h2 { margin: 20px 0 4px; font-size: 24px; }
    .install-card p { margin: 0; color: var(--muted); }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 20px; }
    .meta span { border-radius: 9px; padding: 6px 9px; background: rgba(68,215,182,.09); color: #87eed6; font-size: 13px; }
    .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 88px; }
    .feature { padding: 24px; border-radius: 20px; }
    .feature .number { color: var(--brand); font-size: 13px; font-weight: 800; }
    .feature h3 { margin: 8px 0 8px; font-size: 19px; }
    .feature p { margin: 0; color: var(--muted); }
    .manifest {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 18px;
      border: 1px solid var(--panel-border);
      border-radius: 14px;
      padding: 12px 12px 12px 15px;
      background: rgba(0,0,0,.18);
    }
    .manifest code { min-width: 0; overflow: hidden; color: #cbd5e1; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
    .manifest button { border: 0; border-radius: 9px; padding: 8px 10px; color: var(--ink); background: rgba(255,255,255,.1); cursor: pointer; }
    footer { display: flex; justify-content: space-between; gap: 24px; padding: 32px 0 42px; border-top: 1px solid var(--panel-border); color: var(--muted); font-size: 14px; }
    footer p { margin: 0; }
    @media (max-width: 800px) {
      .hero { grid-template-columns: minmax(0, 1fr); gap: 40px; }
      .install-card { max-width: 520px; }
      .features { grid-template-columns: 1fr; margin-top: 60px; }
      main { padding-top: 28px; }
    }
    @media (max-width: 520px) {
      .shell { width: min(100% - 24px, 1120px); }
      .nav { min-height: 70px; }
      .nav .tag { display: none; }
      .actions { flex-direction: column; }
      .button { width: 100%; }
      footer { flex-direction: column; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .button { transition: none; }
    }
  </style>
</head>
<body>
  <header class="shell nav">
    <a class="brand" href="/" aria-label="${name} ana sayfa">
      <img src="${escapeHtml(logo)}" alt="" width="44" height="44">
      <span>${name}</span>
    </a>
    <span class="tag">Resmî olmayan topluluk eklentisi</span>
  </header>

  <main class="shell">
    <section class="hero">
      <div>
        <div class="eyebrow">Stremio için Türkçe altyazı</div>
        <h1>İzlediğin içeriğe uygun altyazıyı zahmetsizce bul.</h1>
        <p class="lead">${description} Film ve dizilerde uygun Türkçe altyazıları tek ekranda listeler.</p>
        <div class="actions">
          <a class="button primary" href="${escapeHtml(stremioUrl)}">Stremio'ya Ekle <span aria-hidden="true">→</span></a>
          <a class="button secondary" href="#nasil-calisir">Nasıl çalışır?</a>
        </div>
      </div>

      <aside class="install-card" aria-label="Eklenti bilgileri">
        <img src="${escapeHtml(logo)}" alt="${name} logosu" width="76" height="76">
        <h2>${name}</h2>
        <p>Sürüm ${version}</p>
        <div class="meta"><span>Filmler</span><span>Diziler</span><span>Türkçe</span></div>
        <div class="manifest">
          <code title="${escapeHtml(manifestUrl)}">${escapeHtml(manifestUrl)}</code>
          <button id="copyManifest" type="button">Kopyala</button>
        </div>
      </aside>
    </section>

    <section class="features" id="nasil-calisir" aria-label="Nasıl çalışır">
      <article class="feature"><div class="number">01</div><h3>Eklentiyi kur</h3><p>Tek tıklamayla manifest'i Stremio'ya ekle.</p></article>
      <article class="feature"><div class="number">02</div><h3>Filmi veya diziyi aç</h3><p>Altyazılar içerik ve bölüm bilgisine göre otomatik aranır.</p></article>
      <article class="feature"><div class="number">03</div><h3>Türkçe altyazıyı seç</h3><p>Uygun sürümler Stremio'nun altyazı menüsünde görünür.</p></article>
    </section>
  </main>

  <footer class="shell">
    <p>TurkceAltyazi.org ve Stremio ile resmî bağlantısı olmayan topluluk projesidir.</p>
    ${contactEmail ? `<a href="mailto:${contactEmail}">${contactEmail}</a>` : ''}
  </footer>

  <script>
    const manifestUrl = ${serializedManifestUrl};
    const copyButton = document.getElementById('copyManifest');
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(manifestUrl);
        copyButton.textContent = 'Kopyalandı';
        window.setTimeout(() => { copyButton.textContent = 'Kopyala'; }, 1600);
      } catch {
        window.prompt('Manifest adresini kopyalayın:', manifestUrl);
      }
    });
  </script>
</body>
</html>`;
}

module.exports = landingTemplate;
