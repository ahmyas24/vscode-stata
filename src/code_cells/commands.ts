/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { openStataInteractiveWindow } from "./interactiveWindow";
import { getActiveCodeCellManager } from "./codeCellManager";

export function registerCommands(disposables: vscode.Disposable[]) {
  disposables.push(
    // Interactive Window
    vscode.commands.registerCommand(
      "vscode-stata.openInteractive",
      async () => {
        await openStataInteractiveWindow();
      }
    ),

    // Movement
    vscode.commands.registerCommand(
      "vscode-stata.goToPreviousCell",
      (line?: number) => {
        getActiveCodeCellManager()?.goToPreviousCell(line);
      }
    ),
    vscode.commands.registerCommand(
      "vscode-stata.goToNextCell",
      (line?: number) => {
        getActiveCodeCellManager()?.goToNextCell(line);
      }
    ),

    // Insert cell
    vscode.commands.registerCommand(
      "vscode-stata.insertCodeCell",
      async (line?: number) => {
        await getActiveCodeCellManager()?.insertCodeCell(line);
      }
    ),

    // Run cells
    vscode.commands.registerCommand("vscode-stata.runAllCells", async () => {
      await getActiveCodeCellManager()?.runAllCells();
    }),
    vscode.commands.registerCommand(
      "vscode-stata.runAboveCells",
      async (line?: number) => {
        await getActiveCodeCellManager()?.runAboveCells(line);
      }
    ),
    vscode.commands.registerCommand(
      "vscode-stata.runCurrentAndBelow",
      async (line?: number) => {
        await getActiveCodeCellManager()?.runCurrentAndBelow(line);
      }
    ),
    vscode.commands.registerCommand(
      "vscode-stata.runCurrentCell",
      async (line?: number) => {
        await getActiveCodeCellManager()?.runCurrentCell(line);
      }
    ),
    vscode.commands.registerCommand(
      "vscode-stata.runCurrentCellAndAdvance",
      async (line?: number) => {
        await getActiveCodeCellManager()?.runCurrentAndAdvance(line);
      }
    ),


  );
}
