const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
  extraNodeModules: {
    ...resolver.extraNodeModules,
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('@craftzdog/react-native-buffer'),
    crypto: require.resolve('react-native-crypto'),
    net: require.resolve('react-native-tcp-socket'),
    tls: require.resolve('react-native-tcp-socket'),
    url: require.resolve('react-native-url-polyfill'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    http2: require.resolve('http2-wrapper'),
    zlib: require.resolve('browserify-zlib'),
    path: require.resolve('path-browserify'),
    'nice-grpc': require.resolve('nice-grpc-web'),
    'sodium-universal': require.resolve('sodium-javascript'),
    querystring: require.resolve('querystring-es3'),
    events: require.resolve('events'),
  },
  resolveRequest: (context, moduleName, platform) => {
    // Handle @/ alias
    if (moduleName.startsWith('@/')) {
      const resolvedPath = moduleName.replace('@/', path.resolve(__dirname, 'src') + '/');
      try {
        return context.resolveRequest(context, resolvedPath, platform);
      } catch (e) {
        // If the resolved path fails, fall through to default behavior
      }
    }

    // Polyfills for modules that aren't available in React Native
    if (moduleName === 'stream') {
      return {
        filePath: require.resolve('stream-browserify'),
        type: 'sourceFile',
      };
    } else if (moduleName === 'url') {
      return {
        filePath: require.resolve('react-native-url-polyfill'),
        type: 'sourceFile',
      };
    }

    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
