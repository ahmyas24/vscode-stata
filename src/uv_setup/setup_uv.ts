import vscode from "vscode";
import { Logger } from "../logging";
import { FileUtils } from "../file_utils";
import fs from "fs";
import path from "path";
import childProcess from "child_process";

export const PYTHON_PATH = ".python-path";

const IS_WINDOWS = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const IS_LINUX = !IS_WINDOWS && !IS_MAC;

// Python environment utilities
const PythonUtils = {
  getSystemPythonCommand: () => (IS_WINDOWS ? "py" : "python3"),

  getVenvPythonPath: () => {
    return IS_WINDOWS
      ? FileUtils.getExtensionFilePath(path.join(".venv", "Scripts", "python.exe"))
      : FileUtils.getExtensionFilePath(path.join(".venv", "bin", "python"));
  },

  getPythonCommand: () => {
    const pythonPathFile = FileUtils.getExtensionFilePath(PYTHON_PATH);

    // Check primary Python path file
    if (fs.existsSync(pythonPathFile)) {
      const pythonCommand = FileUtils.readFileContent(pythonPathFile);
      if (pythonCommand && fs.existsSync(pythonCommand)) {
        Logger.info(`Using virtual environment Python: ${pythonCommand}`);
        return pythonCommand;
      }
      Logger.error(`Python path ${pythonCommand} does not exist`);
    }

    // Fall back to system Python
    return PythonUtils.getSystemPythonCommand();
  },
};

// Check if uv and nbstata are available and prompt user for installation
export async function promptForSetup(): Promise<boolean> {
	const message = "Do you want to install `uv` and `nbstata` for the interactive window? This will enable Jupyter notebook functionality with Stata.";
	const installOption = "Install";
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
			Logger.info("User chose to install uv and nbstata");
			installDependencies();
			return true;
		case learnMoreOption:
			vscode.env.openExternal(vscode.Uri.parse("https://github.com/astral-sh/uv"));
			// Show the prompt again after opening the link
			return await promptForSetup();
		case skipOption:
		default:
			Logger.info("User chose to skip installation");
			return false;
	}
}

// Check if dependencies are already installed
export function checkDependenciesInstalled(): boolean {
	try {
		// Check if uv is available
		childProcess.execSync('which uv', { stdio: 'ignore' });
		
		// Check if nbstata is available in the Python environment
		const pythonCommand = PythonUtils.getPythonCommand();
		childProcess.execSync(`${pythonCommand} -c "import nbstata"`, { stdio: 'ignore' });
		
		Logger.info("Dependencies (uv and nbstata) are already installed");
		return true;
	} catch (error) {
		Logger.info("Dependencies not found, installation may be needed");
		return false;
	}
}

// Install Python dependencies
export function installDependencies() {
	const checkPythonScriptPath = FileUtils.getExtensionFilePath(
		"src/uv_setup/check_python.js"
	);
  Logger.info("Setting up Python dependencies during extension activation...");

	// Show progress notification
	vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Installing uv and nbstata...",
		cancellable: false
	}, async (progress) => {
		progress.report({ increment: 0, message: "Starting installation..." });

		try {
			const installProcess = childProcess.fork(checkPythonScriptPath, [], { stdio: "pipe" });

			installProcess.stdout?.on("data", (data) => {
				const output = data.toString().trim();
				Logger.info(`[Python Setup] ${output}`);
				progress.report({ message: output });
			});
			
			installProcess.stderr?.on("data", (data) => {
				const output = data.toString().trim();
				Logger.error(`[Python Setup Error] ${output}`);
				progress.report({ message: `Error: ${output}` });
			});
			
			installProcess.on("exit", (code) => {
				if (code === 0) {
					Logger.info("Python environment setup successfully");
					progress.report({ increment: 100, message: "Installation completed successfully!" });
					vscode.window.showInformationMessage(
						"Successfully installed uv and nbstata! You can now use the interactive window."
					);
				} else {
					Logger.error(`Failed to set up Python environment. Exit code: ${code}`);
					vscode.window.showErrorMessage(
						"Failed to set up Python environment for `nbstata` kernel. Please check the output panel for details."
					);
				}
			});

			installProcess.on("error", (error: any) => {
				Logger.error(`Error setting up Python environment: ${error.message}`);
				vscode.window.showErrorMessage(
					`Error setting up Python environment: ${error.message}`
				);
			});
		} catch (error: any) {
			Logger.error(`Error running Python setup script: ${error.message}`);
			vscode.window.showErrorMessage(
				`Error setting up Python environment: ${error.message}`
			);
		}
	});
}

// Convenience function to check and prompt for setup if needed
export async function checkAndPromptForSetup(): Promise<void> {
	if (!checkDependenciesInstalled()) {
		await promptForSetup();
	} 
}
