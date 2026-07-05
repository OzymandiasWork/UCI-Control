// Verifica los artefactos PWA en producción.
const base = 'https://ucicontrol.cl'
for (const path of ['/manifest.webmanifest', '/sw.js', '/registerSW.js', '/icon-512.png', '/icon-192.png', '/apple-touch-icon.png', '/favicon.svg']) {
  const r = await fetch(base + path, { redirect: 'follow' })
  const len = r.headers.get('content-length') ?? '?'
  console.log(`${path}: HTTP ${r.status} (${len} bytes, ${r.headers.get('content-type')})`)
}
const html = await (await fetch(base, { redirect: 'follow' })).text()
console.log('\nHTML incluye manifest:', html.includes('manifest.webmanifest') ? 'SÍ ✔' : 'NO ✘')
console.log('HTML incluye theme-color:', html.includes('theme-color') ? 'SÍ ✔' : 'NO ✘')
console.log('HTML registra service worker:', html.includes('registerSW') ? 'SÍ ✔' : 'NO ✘')
