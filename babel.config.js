module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Drizzle's migrations are .sql files, bundled as text.
      ['inline-import', { extensions: ['.sql'] }],
      // Must stay last.
      'react-native-reanimated/plugin',
    ],
  };
};
