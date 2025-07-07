
export default {
  basePath: 'https://SaaveDar.github.io/appreciclaje',
  supportedLocales: {
  "en-US": ""
},
  entryPoints: {
    '': () => import('./main.server.mjs')
  },
};
