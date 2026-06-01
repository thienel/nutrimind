module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@features': './src/features',
            '@shared': './src/shared',
            '@services': './src/services',
            '@database': './src/database',
            '@utils': './src/utils',
            '@prompts': './src/prompts',
            '@types': './src/types',
            '@app': './src/app',
          },
        },
      ],
    ],
  };
};
