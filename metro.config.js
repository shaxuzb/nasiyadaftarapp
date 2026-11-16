const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Drizzle's migrations for the on-device database are .sql files.
config.resolver.sourceExts.push("sql");

module.exports = config;
