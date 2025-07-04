
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: 'C:/Program Files/Git/appreciclaje/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-ZLLSQVC3.js"
    ],
    "route": "/Program%20Files/Git/appreciclaje/categorias"
  },
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje/inicio"
  },
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje/mapa"
  },
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje/juego"
  },
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje/noticias"
  },
  {
    "renderMode": 2,
    "route": "/Program%20Files/Git/appreciclaje/perfil"
  },
  {
    "renderMode": 2,
    "redirectTo": "/Program%20Files/Git/appreciclaje/inicio",
    "route": "/Program%20Files/Git/appreciclaje/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 23947, hash: '2e10cccc560c2399f7cd41e73e5b571105b318ff1561a3a1bd254af0ab921a71', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17468, hash: '7e1ddc8e5252211fc115c7cbe6265e556736ca2d7ee73db1909a99a60ec3385d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-QYJ3ZBHG.css': {size: 7138, hash: '6EXsMia8ouA', text: () => import('./assets-chunks/styles-QYJ3ZBHG_css.mjs').then(m => m.default)}
  },
};
