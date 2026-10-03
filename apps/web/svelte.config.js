import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true,
    }),
    // GitHub Pages serves project sites from /<repo>. Set BASE_PATH in CI; empty locally.
    paths: {
      base: process.env.BASE_PATH ?? '',
    },
  },
};

export default config;
