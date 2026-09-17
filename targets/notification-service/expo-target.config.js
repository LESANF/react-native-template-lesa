/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'notification-service',
  name: 'ImageNotification',
  bundleIdentifier: '.ImageNotification',
  deploymentTarget: '15.1',
  frameworks: ['UserNotifications'],
  appleTeamId: config.ios?.appleTeamId,
  entitlements: {},
});
