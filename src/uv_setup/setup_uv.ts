import vscode from "vscode";
import { Logger } from "../logging";
import { FileUtils } from "../file_utils";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const IS_WINDOWS = process.platform === "win32";

/**
 * Simplified UV setup with just two steps:
 * 1. Check if uv is installed, if not prompt to install it
 * 2. Run setupPythonWithUv() in the local directory
 */

// Check if uv is installed by running 'which uv' (or 'where uv' on Windows)
async function isUvInstalled(): Promise<boolean> {
  try {
    const command = IS_WINDOWS ? "where uv" : "which uv";
    await execAsync(command);
    Logger.info("✔ UV is already installed");
    return true;
  } catch (error) {
    Logger.info("✖ UV is not installed");
    return false;
  }
}

// Prompt user to install uv
async function promptUvInstallation(): Promise<boolean> {
  const message =
    "UV is required for interactive Stata features. Would you like to install it?";
  const installOption = "Install UV";
  const skipOption = "Skip";
  const learnMoreOption = "Learn More";

  const selection = await vscode.window.showInformationMessage(
    message,
    { modal: false },
    installOption,
    skipOption,
    learnMoreOption
  );

  switch (selection) {
    case installOption:
      Logger.info("User chose to install UV");
      return await installUv();
    case learnMoreOption:
      vscode.env.openExternal(vscode.Uri.parse("https://docs.astral.sh/uv/"));
      // Show the prompt again after opening the link
      return await promptUvInstallation();
    case skipOption:
    default:
      Logger.info("User chose to skip UV installation");
      return false;
  }
}

// Install uv using the official installation script
async function installUv(): Promise<boolean> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Installing UV...",
      cancellable: false,
    },
    async (progress) => {
      try {
        const installCommand = IS_WINDOWS
          ? 'powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"'
          : "curl -LsSf https://astral.sh/uv/install.sh | sh";

        Logger.info(`Running UV installation command: ${installCommand}`);
        await execAsync(installCommand);

        // Verify installation
        const uvInstalled = await isUvInstalled();
        if (uvInstalled) {
          vscode.window.showInformationMessage("UV installed successfully!");
          Logger.info("UV installation completed successfully");
          return true;
        } else {
          throw new Error("UV installation verification failed");
        }
      } catch (error: any) {
        Logger.error(`UV installation failed: ${error.message}`);
        vscode.window.showErrorMessage(
          `Failed to install UV automatically. Please install it manually from https://docs.astral.sh/uv/getting-started/installation`
        );
        return false;
      }
    }
  );
}

// Prompt user for manual nbstata kernel installation
async function promptManualKernelInstall(pythonPath: string): Promise<void> {
  Logger.info(
    `\n\n!!! Run the following command in your terminal and then restart VSCode: sudo "${pythonPath}" -m nbstata.install\n\n`
  );

  vscode.window
    .showWarningMessage(
      `Python environment created, but nbstata kernel installation requires manual setup. Please run in your terminal: sudo "${pythonPath}" -m nbstata.install. After, you will need to restart VSCode`,
      "Copy Command"
    )
    .then((selection) => {
      if (selection === "Copy Command") {
        vscode.env.clipboard.writeText(
          `sudo "${pythonPath}" -m nbstata.install`
        );
        vscode.commands.executeCommand("workbench.action.terminal.new");
        vscode.window.showInformationMessage(
          "Command copied to clipboard. Paste it in the terminal to complete the setup."
        );
      }
    });
}

// Setup Python environment with uv in the local directory
// This installs jupyter, ipykernel, and nbstata using uv
// Then tries to install the nbstata kernel
async function setupPythonWithUv(): Promise<boolean> {
  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Setting up Python environment...",
      cancellable: false,
    },
    async (progress) => {
      try {
        const extensionDir = FileUtils.getExtensionFilePath("");
        const venvPath = path.join(extensionDir, "src", ".venv");

        // Show the Stata output channel
        Logger.show();

        Logger.info(`\nSetting up nbstata...`);

        // Remove existing venv if it exists
        // TODO: Do we need to do this?
        if (fs.existsSync(venvPath)) {
          Logger.info("Removing existing virtual environment");
          const rmCommand = IS_WINDOWS
            ? `rmdir /s /q "${venvPath}"`
            : `rm -rf "${venvPath}"`;
          await execAsync(rmCommand);
        }

        // Create new venv with Python
        Logger.info(
          `  - Creating Python virtual environment with UV at ${venvPath}`
        );
        await execAsync(`uv venv "${venvPath}"`);

        // Install required packages
        Logger.info(
          "  - Installing Python packages with UV (jupyter, ipykernel, nbstata)"
        );
        const pythonPath = IS_WINDOWS
          ? path.join(venvPath, "Scripts", "python.exe")
          : path.join(venvPath, "bin", "python");
        await execAsync(
          `uv pip install --python "${pythonPath}" jupyter ipykernel nbstata`
        );

        // Install nbstata kernel
        Logger.info("  - Installing nbstata kernelspec to Jupyter");
        await execAsync(`"${pythonPath}" -m nbstata.install`);

        vscode.window.showInformationMessage(
          "Python environment setup completed successfully!"
        );
        Logger.info("✔ Python environment setup completed successfully");
        return true;
      } catch (error: any) {
        Logger.error(`✖ Python environment setup failed`);

        // Check if it's a permission error for nbstata.install
        if (
          error.message.includes("nbstata.install") ||
          error.message.includes("Permission denied") ||
          error.message.includes("PermissionError") ||
          error.message.includes("kernels/nbstata")
        ) {
          const extensionDir = FileUtils.getExtensionFilePath("");
          const venvPath = path.join(extensionDir, ".venv");
          const pythonPath = IS_WINDOWS
            ? path.join(venvPath, "Scripts", "python.exe")
            : path.join(venvPath, "bin", "python");

          await promptManualKernelInstall(pythonPath);
          return false;
        } else {
          Logger.error(`\n${error.message}`);
        }

        vscode.window.showErrorMessage(
          `Failed to set up Python environment: ${error.message}`
        );
        return false;
      }
    }
  );
}

// Main setup function that orchestrates the two steps
export async function setupEnvironment(): Promise<boolean> {
  Logger.info("Starting simplified UV and Python environment setup");

  // Step 1: Check if UV is installed, if not prompt to install
  const uvInstalled = await isUvInstalled();
  if (!uvInstalled) {
    const installed = await promptUvInstallation();
    if (!installed) {
      Logger.info("UV installation skipped by user");
      return false;
    }
  }

  // Step 2: Setup Python environment with UV
  return await setupPythonWithUv();
}

// Convenience function to check dependencies and setup if needed
export async function checkAndSetupIfNeeded(): Promise<boolean> {
  // Check if nbstata is on system `jupyter kernelspec` (whatever `jupyter` is on PATH)
  try {
    const { stdout } = await execAsync("jupyter kernelspec list --json");
    const kernelspecs = JSON.parse(stdout);

    if (kernelspecs.kernelspecs && kernelspecs.kernelspecs.nbstata) {
      Logger.info("✔ nbstata kernel found in Jupyter kernelspec");
      return true;
    }
  } catch (error) {}

  try {
    // Check if we already have a working Python environment
    const extensionDir = FileUtils.getExtensionFilePath("");
    const venvPath = path.join(extensionDir, "src", ".venv");

    if (fs.existsSync(venvPath)) {
      const pythonPath = IS_WINDOWS
        ? path.join(venvPath, "Scripts", "python.exe")
        : path.join(venvPath, "bin", "python");

      if (fs.existsSync(pythonPath)) {
        // Quick check if nbstata is available
        try {
          await execAsync(`"${pythonPath}" -c "import nbstata"`);
          // this means nbstata is installed and working, we just need it to be in the kernelspec
          promptManualKernelInstall(pythonPath);
          return true;
        } catch (error) {}
      }
    }

    // If we get here, we need to set up the environment
    return await setupEnvironment();
  } catch (error: any) {
    Logger.error(`Error checking environment: ${error.message}`);
    return false;
  }
}

// Auto setup function for extension activation
export async function autoSetup(): Promise<void> {
  const success = await checkAndSetupIfNeeded();
  if (!success) {
    Logger.info("Automatic environment setup was not completed");
  }
}
