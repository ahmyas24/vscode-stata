import vscode from "vscode";
import path from "path";
import fs from "fs";

// Check if active editor is a Stata file
export function checkActiveEditorIsStata(editor: vscode.TextEditor) {
  if (!editor) {
    return;
  }

  const doc = editor.document;
  const isStataFile =
    doc.fileName.toLowerCase().endsWith(".do") ||
    doc.fileName.toLowerCase().endsWith(".ado") ||
    doc.fileName.toLowerCase().endsWith(".mata") ||
    doc.languageId === "stata";

    return isStataFile;
}


// Find stata path
let detectedStataPath: any = null;
const IS_WINDOWS = process.platform === "win32";
const IS_MAC = process.platform === "darwin";
const IS_LINUX = !IS_WINDOWS && !IS_MAC;

export async function detectStataPath() {
	if (detectedStataPath) {
		return detectedStataPath;
	}

	let possiblePaths: string[] = [];
	if (IS_WINDOWS) {
		const programFiles = process.env.ProgramFiles || "C:\\Program Files";
		const programFilesX86 =
			process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
		possiblePaths = [
			path.join(programFiles, "Stata19"),
			path.join(programFiles, "Stata18"),
			path.join(programFiles, "Stata17"),
			path.join(programFilesX86, "Stata19"),
			path.join(programFilesX86, "Stata18"),
			path.join(programFilesX86, "Stata17"),
		];
	} else if (IS_MAC) {
		possiblePaths = [
			"/Applications/Stata19",
			"/Applications/Stata18",
			"/Applications/Stata17",
			"/Applications/StataNow",
			"/Applications/Stata",
		];
	} else if (IS_LINUX) {
		possiblePaths = [
			"/usr/local/stata19",
			"/usr/local/stata18",
			"/usr/local/stata17",
			"/usr/local/stata",
		];
	}

	for (const p of possiblePaths) {
		if (fs.existsSync(p)) {
			detectedStataPath = p;
			return p;
		}
	}

	return null;
}

export async function detectAndUpdateStataPath() {
	const path = await detectStataPath();
	if (path) {
		const config = vscode.workspace.getConfiguration("vscode-stata");
		await config.update("stataPath", path, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage(
			`Stata path detected and set to: ${path}`
		);
		return path;
	} else {
		vscode.window.showErrorMessage(
			"Could not detect Stata installation path. Please set it manually in settings."
		);
		vscode.commands.executeCommand(
			"workbench.action.openSettings",
			"vscode-stata.stataPath"
		);
		return null;
	}
}
