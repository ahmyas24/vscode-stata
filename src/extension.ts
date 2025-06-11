import * as vscode from "vscode";
import { initializeLogging, Logger } from "./logging";

// Interactive Window
import { detectStataPath } from "./utils";
import { setupFileUtils } from "./file_utils";
import { setupEnvironment, autoSetup } from "./uv_setup/setup_uv";
import { getStataInteractiveManager } from "./code_cells/interactiveWindow";
import { CellCodeLensProvider } from "./code_cells/codeLenses";
import { activateDecorations } from "./code_cells/decorations";
import { activateContextKeys } from "./code_cells/context";
import { registerCommands } from "./code_cells/commands";
import { activateDocumentManagers } from "./code_cells/documentManager";

// Send code to Stata
import {
  sendAll,
  sendAbove,
  sendCurrentAndBelow,
  sendSelectionOrCurrentLine,
} from "./stata_run/send_code";

let stataInteractiveManager: any = null;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Setup "Stata" output channel
  initializeLogging(context);
  
  // Auto-detect Stata path
  const config = vscode.workspace.getConfiguration("vscode-stata");
  detectStataPath().then((path) => {
    if (path) {
      const userPath = config.get("stataPath");
      // Set Stata path option after finding it
      if (!userPath) {
        config
          .update("stataPath", path, vscode.ConfigurationTarget.Global)
          .then(() => {
            Logger.info(`Detected Stata installation: ${path}`);
          });
      }
    }
  });

  // stataRun (i.e. send code to open stata window)
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-stata.sendAll", () => sendAll()),
    vscode.commands.registerCommand("vscode-stata.sendAbove", () =>
      sendAbove()
    ),
    vscode.commands.registerCommand("vscode-stata.sendCurrentAndBelow", () =>
      sendCurrentAndBelow()
    ),
    vscode.commands.registerCommand(
      "vscode-stata.sendSelectionOrCurrentLine",
      () => sendSelectionOrCurrentLine()
    ),
    // Setup command for manual Python environment installation
    vscode.commands.registerCommand(
      "vscode-stata.setupPythonEnvironment", 
      () => {
        Logger.info("Manual Python environment setup requested by user");
        setupEnvironment();
      }
    )
  );

  // Setup `uv` and `nbstata` automatically (if enabled)
  setupFileUtils(context);
  autoSetup().catch((error) => {
    Logger.error(`✖ Failed to auto-setup Python environment: ${error}`);
  });

  // Track interactive feature disposables
  let interactiveDisposables: vscode.Disposable[] = [];
  let codeLensProvider: CellCodeLensProvider | undefined;

  // Function to activate/deactivate interactive features
  function updateInteractiveFeatures() {
    // Dispose existing interactive features
    interactiveDisposables.forEach((d) => d.dispose());
    interactiveDisposables = [];

    // Get fresh configuration each time
    const currentConfig = vscode.workspace.getConfiguration("vscode-stata");

    // Only enable interactive features if useInteractive is enabled
    if (currentConfig.get("useInteractive")) {
      // Initialize Stata Interactive Window Manager only when needed
      if (!stataInteractiveManager) {
        stataInteractiveManager = getStataInteractiveManager(context);
      }

      // Setup document parsing and cache
      activateDocumentManagers(interactiveDisposables);

      // Commands for running cells and jumping around cells
      registerCommands(interactiveDisposables);

      // Create or reuse code lens provider and register it
      if (!codeLensProvider) {
        codeLensProvider = new CellCodeLensProvider();
      }
      interactiveDisposables.push(
        vscode.languages.registerCodeLensProvider("stata", codeLensProvider)
      );

      activateContextKeys(interactiveDisposables);
      activateDecorations(interactiveDisposables);
    } else {
      // Clean up interactive manager when disabled
      if (stataInteractiveManager) {
        stataInteractiveManager.dispose();
        stataInteractiveManager = null;
      }
    }

    // Refresh code lenses regardless of whether they're enabled or disabled
    if (codeLensProvider) {
      codeLensProvider.refresh();
    }
  }

  // Initial setup
  updateInteractiveFeatures();

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("vscode-stata.useInteractive")) {
        updateInteractiveFeatures();
      }
    })
  );
}

export function deactivate() {
  if (stataInteractiveManager) {
    stataInteractiveManager.dispose();
  }
}
