
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: 'https://SaaveDar.github.io/appreciclaje/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/appreciclaje"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-ZLLSQVC3.js"
    ],
    "route": "/appreciclaje/categorias"
  },
  {
    "renderMode": 2,
    "route": "/appreciclaje/inicio"
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
    "redirectTo": "/appreciclaje/inicio",
    "route": "/appreciclaje/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 23953, hash: 'eb84332174d9235c2b20177333185085ffe1a9b6b51d023e25333f26ece4b54c', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17474, hash: '1002821685dee3fd3a220ee8127089aa10eb03a609dde66b34cc156b4e412f64', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'inicio/index.html': {size: 46909, hash: '08f05bf69d491bd60a20162e4887f9d41211324fc1e9a73018fcca84db5ee2fe', text: () => import('./assets-chunks/inicio_index_html.mjs').then(m => m.default)},
    'index.html': {size: 46909, hash: '08f05bf69d491bd60a20162e4887f9d41211324fc1e9a73018fcca84db5ee2fe', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'juego/index.html': {size: 39457, hash: '26f65ef05886f60d44ab0fabbf7f695150449a90e5aacd9818d6869a53fc237a', text: () => import('./assets-chunks/juego_index_html.mjs').then(m => m.default)},
    'categorias/index.html': {size: 38348, hash: 'f0a1c791a7640f1a7e06792a14805c25c9edf3c5cc4403ec5360670fa60b5506', text: () => import('./assets-chunks/categorias_index_html.mjs').then(m => m.default)},
    'noticias/index.html': {size: 37614, hash: '80bb8485f27519b8aeca539944f8576fedb73d0ae06809e27776392993c278e4', text: () => import('./assets-chunks/noticias_index_html.mjs').then(m => m.default)},
    'mapa/index.html': {size: 41564, hash: 'c737768c37786c9570ace4ad807446f1aaf495a8c812e8e761ee941aaea7e0f9', text: () => import('./assets-chunks/mapa_index_html.mjs').then(m => m.default)},
    'perfil/index.html': {size: 38472, hash: '826b38b4e83831d8b86363c2812fc6ddf6e13a9c17636346fd8fbec523eed57a', text: () => import('./assets-chunks/perfil_index_html.mjs').then(m => m.default)},
    'styles-QYJ3ZBHG.css': {size: 7138, hash: '6EXsMia8ouA', text: () => import('./assets-chunks/styles-QYJ3ZBHG_css.mjs').then(m => m.default)}
  },
};
