const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfilePath, "utf8");

      if (!contents.includes("use_modular_headers!")) {
        contents = contents.replace(
          "use_expo_modules!",
          "use_expo_modules!\n  use_modular_headers!"
        );
      }

      if (!contents.includes("BUILD_LIBRARY_FOR_DISTRIBUTION")) {
        const fix = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |cfg|
        cfg.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'NO'
      end
    end`;
        // Insert after the closing ) of react_native_post_install(...).
        // The outer ) sits on its own indented line ("\n    )"), so match that
        // to avoid stopping at the inline ccache_enabled?(...) paren.
        contents = contents.replace(
          /react_native_post_install\([\s\S]*?\n\s*\)/,
          (match) => match + fix
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
