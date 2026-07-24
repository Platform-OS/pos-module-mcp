const { setWindowSize } = require('@codeceptjs/configure');

setWindowSize(1366, 768);

exports.config = {
  tests: './spec/e2e/*_test.js',
  output: './tmp',
  helpers: {
    Puppeteer: {
      url: process.env.MPKIT_URL,
      restart: false, // restart browser between Scenarios
      show: false // show Chromium browser while running tests
    }
  },
  include: {
    I: './spec/e2e/helpers/steps_helper.js',
  },
  bootstrap: null,
  mocha: {
    "reporterOptions": {
      reportDir: ".",
      reportFilename: "test-report.html",
      inline: true
    }
  },
  name: 'template',
  rerun: {
    minSuccess: 1,
    maxReruns: 3,
  },
  plugins: {
    pauseOnFail: {},
    retryFailedStep: {
      enabled: true
    },
    tryTo: {
      enabled: true
    },
    screenshotOnFail: {
      enabled: true
    },
    customLocator: {
      enabled: true,
      attribute: 'data-test'
    }
  }
}
