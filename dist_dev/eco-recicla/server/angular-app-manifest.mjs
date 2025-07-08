
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: 'https://saavedar.github.io/appreciclaje/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/appreciclaje"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-ZNGQP6FZ.js"
    ],
    "route": "/appreciclaje/categorias"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/inicio"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-GYWQNPD7.js"
    ],
    "route": "/appreciclaje/nosotros"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/mapa"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/juego"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/noticias"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/perfil"
  },
  {
    "renderMode": 2,
    "redirectTo": "/appreciclaje",
    "route": "/appreciclaje/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 24029, hash: '2f61ac3a4dd831e73440ad2d38708b1bdce7fb33779490fa7081c30e85242c00', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17550, hash: 'c9eaad60065acaaea353253f77e5d6b3e12ef882a0c10d29b3d0017b8540acef', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'categorias/index.html': {size: 40930, hash: '332612fa279f0da57bec76b01633c0d85d56aa23b11d6e7775e2092819529ea4', text: () => import('./assets-chunks/categorias_index_html.mjs').then(m => m.default)},
    'inicio/index.html': {size: 49491, hash: '4964254072936e164e550c2647ff72ff111d50de7b1252ca12ac1c8b4c08491e', text: () => import('./assets-chunks/inicio_index_html.mjs').then(m => m.default)},
    'juego/index.html': {size: 42039, hash: '764506528c72624c371663279ace9d22ab19681076697e744adc7199b4c5cf22', text: () => import('./assets-chunks/juego_index_html.mjs').then(m => m.default)},
    'noticias/index.html': {size: 40196, hash: '9b8b7dee0577a0f7eb00a0bc92bcc4a6cfeef7dfa034969b6b7b0d437d93bdb6', text: () => import('./assets-chunks/noticias_index_html.mjs').then(m => m.default)},
    'mapa/index.html': {size: 44146, hash: '18b9bbfe07d04489a6dc48feb53ef39183fa980ac826a73565fd1c1dfbbb685c', text: () => import('./assets-chunks/mapa_index_html.mjs').then(m => m.default)},
    'nosotros/index.html': {size: 41114, hash: '63003b58df6bea0d19340a3113958ebabbdd8ce5e4fd4ff05a600d33a904148e', text: () => import('./assets-chunks/nosotros_index_html.mjs').then(m => m.default)},
    'index.html': {size: 49491, hash: '4964254072936e164e550c2647ff72ff111d50de7b1252ca12ac1c8b4c08491e', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'perfil/index.html': {size: 47796, hash: '8d324c9b7db49a7b2d08800287355fe4da24ab00068539453377f3d2992dab9d', text: () => import('./assets-chunks/perfil_index_html.mjs').then(m => m.default)},
    'styles-QYJ3ZBHG.css': {size: 7138, hash: '6EXsMia8ouA', text: () => import('./assets-chunks/styles-QYJ3ZBHG_css.mjs').then(m => m.default)}
  },
};
