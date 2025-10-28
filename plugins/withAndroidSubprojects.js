const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidSubprojects = (config) => {
  return withProjectBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      // Add subprojects block after allprojects
      const subprojectsBlock = `
subprojects {
  afterEvaluate { project ->
    if (project.hasProperty('android')) {
      project.android {
        compileSdkVersion = 36
      }
    }
  }
}
`;

      // Insert the subprojects block after the allprojects block
      if (!modConfig.modResults.contents.includes('subprojects {')) {
        const allProjectsEndIndex = modConfig.modResults.contents.indexOf(
          '}',
          modConfig.modResults.contents.indexOf('allprojects {')
        );
        if (allProjectsEndIndex !== -1) {
          modConfig.modResults.contents =
            modConfig.modResults.contents.slice(0, allProjectsEndIndex + 1) +
            '\n' +
            subprojectsBlock +
            modConfig.modResults.contents.slice(allProjectsEndIndex + 1);
        }
      }
    }
    return modConfig;
  });
};

module.exports = withAndroidSubprojects;
