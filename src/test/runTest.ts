import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { runTests } from "@vscode/test-electron";

/**
 * Entry point for VS Code test runner.
 */
async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    // Create a temporary workspace directory for testing
    const tempWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-workspace-'));
    console.log(`Created temporary test workspace: ${tempWorkspace}`);

    // Create a simple file in the workspace so it's not empty
    fs.writeFileSync(path.join(tempWorkspace, 'temp.js'), '# Test Workspace');

    try {
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        // This is the key part - tell VS Code to open this folder as the workspace
        launchArgs: [
          tempWorkspace,  // Open this folder as workspace
          '--disable-gpu'          // Disable GPU for stability in CI
        ]
      });
      console.log('Tests completed successfully');
    } finally {
      // Clean up the temporary workspace
      try {
        fs.rmSync(tempWorkspace, { recursive: true, force: true });
        console.log(`Cleaned up temporary workspace: ${tempWorkspace}`);
      } catch (cleanupErr) {
        console.error('Failed to cleanup temp workspace:', cleanupErr);
      }
    }
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  }
}

main();