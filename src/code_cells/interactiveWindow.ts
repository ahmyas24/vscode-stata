import * as vscode from "vscode";
import { Logger } from "../logging";

interface InteractiveWindowInfo {
	notebookEditor: vscode.NotebookEditor
	inputUri: vscode.Uri
}

let interactiveWindow: InteractiveWindowInfo | undefined;

/**
 * Creates and manages the Stata interactive window using existing nbstata kernel
 */
export class StataInteractiveWindowManager {
	constructor(context: vscode.ExtensionContext) {
		// No need to create a custom controller - we'll use the existing nbstata kernel

		// Listen for notebook closures to clean up our reference
		context.subscriptions.push(
			vscode.workspace.onDidCloseNotebookDocument((notebook) => {
				if (
					interactiveWindow &&
					interactiveWindow.notebookEditor.notebook === notebook
				) {
					Logger.info("Interactive window notebook was closed, clearing reference");
					interactiveWindow = undefined;
				}
			})
		);

		// Listen for when the interactive window editor becomes invalid
		context.subscriptions.push(
			vscode.window.onDidChangeVisibleNotebookEditors((editors) => {
				if (interactiveWindow) {
					const stillVisible = editors.some(editor => 
						editor.notebook === interactiveWindow?.notebookEditor.notebook
					);
					if (!stillVisible) {
						Logger.info("Interactive window editor no longer visible, checking validity");
						// Don't clear immediately - will be validated on next use
					}
				}
			})
		);
	}

	/**
	 * Opens or creates the Stata interactive window
	 */
	public async openInteractiveWindow(): Promise<InteractiveWindowInfo> {
		if (interactiveWindow) {
			// Check if the existing interactive window is still valid
			try {
				// Verify the notebook editor is still valid and the document exists
				const notebook = interactiveWindow.notebookEditor.notebook;
				
				// Check if notebook is closed or disposed
				if (notebook.isClosed) {
					Logger.info("Interactive window notebook is closed, clearing reference");
					interactiveWindow = undefined;
				} else {
					// Additional validation: check if the editor is still valid
					const editor = interactiveWindow.notebookEditor;
					if (editor && editor.notebook === notebook) {
						Logger.info("Reusing existing interactive window");
						return interactiveWindow;
					} else {
						Logger.info("Interactive window editor is invalid, clearing reference");
						interactiveWindow = undefined;
					}
				}
			} catch (error) {
				// The notebook editor is no longer valid, clear the reference
				Logger.info(`Interactive window is no longer valid: ${error}`);
				interactiveWindow = undefined;
			}
		}

		try {
			Logger.info("\nCreating new interactive window with nbstata kernel");
			// Use VS Code's built-in interactive.open command with nbstata kernel
			const result = (await vscode.commands.executeCommand(
				"interactive.open",
				{ viewColumn: vscode.ViewColumn.Beside }, // showOptions - open to the side
				undefined, // resource - let VS Code create a new one
				"nbstata", // requires selecting `nbstata`
				"Stata Interactive" // title
			)) as { notebookEditor: vscode.NotebookEditor; inputUri: vscode.Uri };

			interactiveWindow = {
				notebookEditor: result.notebookEditor,
				inputUri: result.inputUri,
			};

			// Give the nbstata kernel time to fully initialize and establish UI communication
			// This helps prevent "UI comm not connected" errors when browsing URLs
			Logger.info("Waiting for nbstata kernel to fully initialize...");
			await new Promise((resolve) => setTimeout(resolve, 1000));
			Logger.info("nbstata kernel initialization complete");

			Logger.info("Opened Stata interactive window with nbstata kernel");
			return interactiveWindow;
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to open Stata interactive window: ${error}`
			);
			throw error;
		}
	}

	/**
	 * Executes Stata code in the interactive window
	 */
	public async executeCodeChunk(code: string): Promise<void> {
		// Strip trailing blank lines and whitespace
		const trimmedCode = code.trimEnd();

		if (!trimmedCode.trim()) {
			return;
		}

		// Split code into lines and find any lines starting with '*% set'
		let lines = trimmedCode.split("\n");
    const magicRegExp = /^\*+\s*%{1,2}(head|tail|fbrowse|fhead|ftail|locals|delimit|help|set|status|echo|noecho|quietly|qui)/;
		const magicCommands = lines.filter((line) => magicRegExp.test(line));
		const otherLines = lines.filter((line) => !magicRegExp.test(line));

		// Execute each '*% set' command separately
		for (const setCmd of magicCommands) {
			await this.sendCodeToInteractiveWindow(setCmd.replace(/^\*+\s*/, ""));
		}

		// If there are other lines, continue with them
		if (otherLines.length === 0) {
			return;
		}
		const codeToRun = otherLines.join("\n");
    await this.sendCodeToInteractiveWindow(codeToRun);
	}

	public async sendCodeToInteractiveWindow(codeToRun: string) {
		try {
			// Ensure interactive window is open - only call this once per session
			let windowInfo = interactiveWindow;
			if (!windowInfo) {
				windowInfo = await this.openInteractiveWindow();
			}

			// Validate the window is still usable
			if (windowInfo.notebookEditor.notebook.isClosed) {
				Logger.info("Interactive window was closed, reopening...");
				windowInfo = await this.openInteractiveWindow();
			}

			// Add code to the notebook as a new cell
			const notebook = windowInfo.notebookEditor.notebook;
			const cellData = new vscode.NotebookCellData(
				vscode.NotebookCellKind.Code,
				codeToRun,
				"stata"
			);

			// Create edit to add the cell
			const edit = new vscode.WorkspaceEdit();
			edit.set(notebook.uri, [
				vscode.NotebookEdit.insertCells(notebook.cellCount, [cellData]),
			]);
			await vscode.workspace.applyEdit(edit);

			// Execute the newly added cell using the selected kernel
			const newCell = notebook.cellAt(notebook.cellCount - 1);
			await vscode.commands.executeCommand("notebook.cell.execute", {
				ranges: [{ start: newCell.index, end: newCell.index + 1 }],
				document: notebook.uri,
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to execute Stata code: ${error}`);
			Logger.info(`Error executing Stata code: ${error}`);
		}
	}

	/**
	 * Cleanup
	 */
	public dispose(): void {
		interactiveWindow = undefined;
		Logger.info("Disposed Stata interactive window manager");
	}
}

// Global instance
let stataInteractiveManager: StataInteractiveWindowManager | undefined;

/**
 * Get or create the Stata interactive window manager
 */
export function getStataInteractiveManager(
	context?: vscode.ExtensionContext
): StataInteractiveWindowManager {
	if (!stataInteractiveManager && context) {
		stataInteractiveManager = new StataInteractiveWindowManager(context);
	}
	if (!stataInteractiveManager) {
		throw new Error("Stata Interactive Window Manager not initialized");
	}
	return stataInteractiveManager;
}

/**
 * Open the Stata interactive window
 */
export async function openStataInteractiveWindow(): Promise<void> {
	const manager = getStataInteractiveManager();
	await manager.openInteractiveWindow();
}

/**
 * Execute Stata code in the interactive window
 */
export async function executeStataCode(code: string): Promise<void> {
	if (!stataInteractiveManager) {
		Logger.error("Stata Interactive Window Manager not initialized. Cannot execute code.");
		vscode.window.showErrorMessage("Interactive window not available. Please ensure the extension is properly loaded.");
		return;
	}
	
	try {
		await stataInteractiveManager.executeCodeChunk(code);
	} catch (error) {
		Logger.error(`Failed to execute Stata code: ${error}`);
		vscode.window.showErrorMessage(`Failed to execute Stata code: ${error}`);
	}
}
