/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

let channel: vscode.OutputChannel | undefined;

export function initializeLogging(context: vscode.ExtensionContext) {
	channel = vscode.window.createOutputChannel('Stata');
  Logger.info("Stata extension activated.");
  Logger.info(`Extension path: ${context.extensionPath || __dirname}\n`);
}
export const Logger = {
  info: (message: string) => {
    if (channel) { channel.appendLine(message); }
  },
  error: (message: string) => {
    if (channel) { channel.appendLine(`${message}`); }
  },
  show: () => {
    channel?.show();
  }
};

export function trace(message: string) {
	channel?.appendLine(message);
}
