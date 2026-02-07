const fs = require("fs").promises;
const path = require("path");
const { processFileActivities } = require("./src/processFileActivities");

/**
 * Main entry point
 */
async function main() {
  // Accept a directory or list of files as input
  const inputArgs = process.argv.slice(2);
  if (inputArgs.length === 0) {
    console.error("Error: No GPX files or directory specified");
    console.error("Usage: node index.js <gpx_file_or_directory>");
    process.exit(1);
  }

  let gpxFiles = [];
  const inputPath = inputArgs[0];
  const verboseFlag = inputArgs.includes("--debug");
  console.log(`Verbose mode: ${verboseFlag}`, { inputArgs });

  const stat = await require("fs").promises.stat(inputPath);
  if (stat.isDirectory()) {
    // Read all .gpx files in the directory
    const files = await require("fs").promises.readdir(inputPath);
    gpxFiles = files
      .filter(
        (f) =>
          f.toLowerCase().endsWith(".gpx") || f.toLowerCase().endsWith(".tcx"),
      )
      .map((f) => require("path").join(inputPath, f));
    if (gpxFiles.length === 0) {
      console.error(`No .gpx or .tcx files found in directory: ${inputPath}`);
      process.exit(1);
    }
    console.log(
      `Found ${gpxFiles.length} .gpx or .tcx file(s) in directory: ${inputPath}`,
    );
  } else {
    // Treat as list of files
    gpxFiles = inputArgs;
  }

  console.log(`Processing ${gpxFiles.length} GPX or TCX file(s)...`);

  // Process activities
  const outputDir = "./output";
  const options = {
    filterType: "Running", // Only process Running activities
    imageWidth: 500,
    imageHeight: 500,
    colors: { track: "#b7d05b", special: "#e22" },
    verbose: verboseFlag,
  };
  const results = await processFileActivities(gpxFiles, outputDir, options);

  // Print summary
  console.log("\n=== Summary ===");
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const total = results.length;
  console.log(`Successful: ${successful} of ${total}`);
  console.log(`    Failed: ${failed} of ${total}`);
  console.log("=== The End ===\n");
}

// Run main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { processFileActivities };
