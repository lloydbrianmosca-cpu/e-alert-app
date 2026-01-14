const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable minification in production
config.transformer.minifierConfig = {
  keep_classnames: false,
  keep_fnames: false,
  mangle: {
    keep_classnames: false,
    keep_fnames: false,
  },
  compress: {
    drop_console: true, // Remove console.log statements
    reduce_funcs: true,
    dead_code: true,
    unused: true,
  },
};

module.exports = config;
