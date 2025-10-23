const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidSubprojects = config => {
  return withProjectBuildGradle(config, config => {
    if (config.modResults.language === 'groovy') {
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
      if (!config.modResults.contents.includes('subprojects {')) {
        const allProjectsEndIndex = config.modResults.contents.indexOf(
          '}',
          config.modResults.contents.indexOf('allprojects {')
        );
        if (allProjectsEndIndex !== -1) {
          config.modResults.contents =
            config.modResults.contents.slice(0, allProjectsEndIndex + 1) +
            '\n' +
            subprojectsBlock +
            config.modResults.contents.slice(allProjectsEndIndex + 1);
        }
      }
    }
    return config;
  });
};

module.exports = withAndroidSubprojects;
