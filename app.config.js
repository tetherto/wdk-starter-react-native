// app.config.js
//
// Thin overlay on top of app.json. Expo evaluates app.json first and passes the
// result in as `config`, so everything static stays in app.json and only the
// values CI has to override live here.
//
// `slug` and `extra.eas.projectId` must resolve at *build* time, not just at
// submit time: eas.json sets `appVersionSource: "remote"` with
// `autoIncrement: true`, so `eas build` contacts the EAS API to read and bump
// the build number and needs to know which project to talk to.
//
// Locally both fall back to the committed values, so `npx expo prebuild` and
// `npm run ios` work with no environment set.

const EAS_PROJECT_ID = 'REPLACE_WITH_EAS_PROJECT_ID';

module.exports = ({ config }) => ({
  ...config,
  slug: process.env.EAS_PROJECT_SLUG || config.slug,
  extra: {
    ...config.extra,
    eas: {
      ...config.extra?.eas,
      projectId: process.env.EAS_PROJECT_ID || EAS_PROJECT_ID,
    },
  },
});
