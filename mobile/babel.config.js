module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins: [
      // react-native-reanimated (via react-native-worklets on SDK 57) must
      // stay last in this list.
      "react-native-worklets/plugin",
    ],
  };
};
