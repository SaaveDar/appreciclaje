
export default {
  basePath: 'https://saavedar.github.io/appreciclaje',
  supportedLocales: {
  "en-US": ""
},
  entryPoints: {
    '': () => import('./main.server.mjs')
  },
};
