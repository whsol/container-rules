export default {
  build: {
    overwriteDest: true,
    filename: "{name}-{version}.xpi",
  },
  run: {
    firefox: "firefoxdeveloperedition",
    browserConsole: true,
  },
};
