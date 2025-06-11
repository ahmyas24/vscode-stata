/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { getOrCreateDocumentManager } from "./documentManager";

export interface SetDecorations {
  (
    editor: vscode.TextEditor,
    decorationType: vscode.TextEditorDecorationType,
    ranges: vscode.Range[]
  ): void;
}

function defaultSetDecorations(
  editor: vscode.TextEditor,
  decorationType: vscode.TextEditorDecorationType,
  ranges: vscode.Range[]
): void {
  editor.setDecorations(decorationType, ranges);
}

// From https://github.com/microsoft/vscode-jupyter/blob/f8c0f925d855a45240fd06875b17216e47eb08f8/src/interactive-window/editor-integration/decorator.ts#L84
const currentCellTop = vscode.window.createTextEditorDecorationType({
  borderColor: new vscode.ThemeColor("interactive.activeCodeBorder"),
  borderWidth: "2px 0px 0px 0px",
  borderStyle: "solid",
  isWholeLine: true,
});

const currentCellBottom = vscode.window.createTextEditorDecorationType({
  borderColor: new vscode.ThemeColor("interactive.activeCodeBorder"),
  borderWidth: "0px 0px 1px 0px",
  borderStyle: "solid",
  isWholeLine: true,
});
export const cellDecorationType = vscode.window.createTextEditorDecorationType({
  light: { backgroundColor: "#E1E1E166" },
  dark: { backgroundColor: "#40404066" },
  isWholeLine: true,
});

export function activateDecorations(
  disposables: vscode.Disposable[],
  setDecorations: SetDecorations = defaultSetDecorations
): void {
  let timeout: NodeJS.Timeout | undefined = undefined;
  let activeEditor = vscode.window.activeTextEditor;

  // Update the active editor's cell decorations.
  function updateDecorations() {
    const config = vscode.workspace.getConfiguration("vscode-stata");
    const docManager =
      activeEditor && getOrCreateDocumentManager(activeEditor.document);
    if (
      !activeEditor ||
      !docManager ||
      activeEditor.document.languageId !== "stata" ||
      !config.get("useInteractive")
    ) {
      return;
    }

    // Get the relevant decoration ranges.
    const cells = docManager.getCells();
    const topLineRanges: vscode.Range[] = [];
    const bottomLineRanges: vscode.Range[] = [];
    
    for (const cell of cells) {
      if (cell.range.contains(activeEditor.selection.active)) {
        // Create ranges for just the top and bottom lines of the cell
        const topLineRange = new vscode.Range(
          cell.range.start.line,
          0,
          cell.range.start.line,
          activeEditor.document.lineAt(cell.range.start.line).text.length
        );
        const bottomLineRange = new vscode.Range(
          cell.range.end.line,
          0,
          cell.range.end.line,
          activeEditor.document.lineAt(cell.range.end.line).text.length
        );
        
        topLineRanges.push(topLineRange);
        bottomLineRanges.push(bottomLineRange);
      }
    }
    
    // Set decorations for top and bottom lines of active cells
    setDecorations(activeEditor, currentCellTop, topLineRanges);
    setDecorations(activeEditor, currentCellBottom, bottomLineRanges);

  }

  // Trigger an update of the active editor's cell decorations, with optional throttling.
  function triggerUpdateDecorations(throttle = false) {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
    if (throttle) {
      timeout = setTimeout(updateDecorations, 250);
    } else {
      updateDecorations();
    }
  }

  // Trigger a decorations update for the current active editor.
  if (activeEditor) {
    triggerUpdateDecorations();
  }

  disposables.push(
    // Trigger a decorations update when the active editor changes.
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    }),

    // Trigger a decorations update when the active editor's content changes.
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true);
      }
    }),

    // Trigger a decorations update when the active editor's content changes.
    vscode.workspace.onDidChangeConfiguration(() => {
      if (activeEditor) {
        triggerUpdateDecorations(true);
      }
    }),

    // Trigger a decorations update when the active editor's selection changes.
    vscode.window.onDidChangeTextEditorSelection((event) => {
      if (activeEditor && event.textEditor === activeEditor) {
        triggerUpdateDecorations();
      }
    })
  );
}
