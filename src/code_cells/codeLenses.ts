/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getOrCreateDocumentManager } from "./documentManager";

export function runCellCodeLens(range: vscode.Range): vscode.CodeLens {
  return new vscode.CodeLens(range, {
    title: vscode.l10n.t("$(run) Run Cell"),
    command: "vscode-stata.runCurrentCell",
    arguments: [range.start.line],
  });
}

export function runAboveCodeLens(range: vscode.Range): vscode.CodeLens {
  return new vscode.CodeLens(range, {
    title: vscode.l10n.t("Run Above"),
    command: "vscode-stata.runAboveCells",
    arguments: [range.start.line],
  });
}

export function runNextCodeLens(range: vscode.Range): vscode.CodeLens {
  return new vscode.CodeLens(range, {
    title: vscode.l10n.t("Run Next"),
    command: "vscode-stata.runNextCell",
    arguments: [range.start.line],
  });
}

export class CellCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const config = vscode.workspace.getConfiguration("vscode-stata");
    const docManager = getOrCreateDocumentManager(document);
    if (!config.get("useInteractive") || !docManager) {
      return [];
    }

    const cells = docManager.getCells();
    const codeLenses: vscode.CodeLens[] = [];
    for (let i = 0; i < cells.length; i += 1) {
      const cell = cells[i];
      const range = cell.range;
      codeLenses.push(runCellCodeLens(range));
      if (i > 0) {
        codeLenses.push(runAboveCodeLens(range));
      }
      if (i < cells.length - 1) {
        codeLenses.push(runNextCodeLens(range));
      }
    }

    return codeLenses;
  }
}
