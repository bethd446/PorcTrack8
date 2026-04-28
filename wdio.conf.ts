import path from 'path';

export const config = {
    runner: 'local',
    port: 4723,
    specs: [
        './test/specs/**/*.e2e.ts'
    ],
    maxInstances: 1,
    capabilities: [{
        platformName: 'Android',
        'appium:deviceName': 'Android Emulator',
        'appium:automationName': 'UiAutomator2',
        'appium:app': path.join(process.cwd(), 'android/app/build/outputs/apk/debug/app-debug.apk'),
        'appium:appPackage': 'com.porc800.porctrack',
        'appium:appActivity': 'com.porc800.porctrack.MainActivity',
        'appium:appWaitActivity': 'com.porc800.porctrack.MainActivity',
        'appium:autoWebview': true,
        'appium:chromedriverAutodownload': true,
    }],
    logLevel: 'info',
    waitforTimeout: 15000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: [['appium', {
        args: {
            allowInsecure: ['uiautomator2:chromedriver_autodownload']
        }
    }]],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
}
