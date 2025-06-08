/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { type Cell, type CellParser, getParser } from './parser';
import { canHaveCells, getOrCreateDocumentManager } from './documentManager';
import { executeStataCode } from './interactiveWindow';
import { Logger } from '../logging';

export interface ExecuteCode {
	(language: string, code: string): Promise<void>;
}

const stataExecuteCode: ExecuteCode = async (language, code) => {
	if (language === 'stata') {
		await executeStataCode(code);
	} else {
		vscode.window.showWarningMessage(`Execution not supported for language: ${language}`);
	}
};

// Handles execution of cells via editor
export class CodeCellManager {
	private parser: CellParser | undefined;
	constructor(
		private editor: vscode.TextEditor,
		private readonly executeCode: ExecuteCode = stataExecuteCode,
	) {
		this.parser = getParser(this.editor.document.languageId);
	}

	private getCursor(line?: number): vscode.Position {
		if (line !== undefined) {
			return new vscode.Position(line, 0);
		}
		return this.editor.selection.active;
	}

	private getCells(): Cell[] | undefined {
		return getOrCreateDocumentManager(this.editor.document)?.getCells();
	}

	private getCurrentCell(line?: number) {
		const cursor = this.getCursor(line);
		const cells = this.getCells();
		if (!cells) { return; }

		return cells.find(cell => {
			return cell.range.contains(cursor);
		});
	}
	
	private getNextCell(line?: number) {
		const cursor = this.getCursor(line);
		const cells = this.getCells();
		if (!cells) { return; }

		return cells.find(cell => {
			return cell.range.end.isAfter(cursor) && !cell.range.contains(cursor);
		});
	}
	
	private getPreviousCell(line?: number) {
		const cursor = this.getCursor(line);
		const cells = this.getCells();
		if (!cells) { return; }

		return cells.filter(cell => {
			return cell.range.start.isBefore(cursor) && !cell.range.contains(cursor);
		}).at(-1);
	}

	private goToCell(cell: Cell): void {
		// Skip the cell marker line
		const line = Math.min(cell.range.start.line + 1, cell.range.end.line);
		const cursor = new vscode.Position(line, 0);
		this.editor.selection = new vscode.Selection(cursor, cursor);
		this.editor.revealRange(cell.range);
	}

	// Run cells
	private async runCell(cell: Cell): Promise<void> {
		if (!this.parser) { return; }
		const text = this.parser.getCellText(cell, this.editor.document);
		try {
			await this.executeCode(this.editor.document.languageId, text);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to execute cell: ${error}`);
		}
	}

	// Run commands
	public async runCurrentCell(line?: number): Promise<void> {
		const cell = this.getCurrentCell(line);
		if (cell) {
			await this.runCell(cell);
		}
	}
	public async runCurrentAndAdvance(line?: number): Promise<void> {
		await this.runCurrentCell(line);
		this.goToNextCell(line);
	}
	public async runAllCells(): Promise<void> {
		const cells = this.getCells();
		if (cells) {
			// Sort cells by their start position to ensure proper execution order
			const sortedCells = cells.sort((a, b) => {
				if (a.range.start.line !== b.range.start.line) {
					return a.range.start.line - b.range.start.line;
				}
				return a.range.start.character - b.range.start.character;
			});
			
			for (const cell of sortedCells) {
				await this.runCell(cell);
			}
		}
	}
	public async runAboveCells(line?: number): Promise<void> {
		const cursor = this.getCursor(line);
		const cells = this.getCells();
		if (cells) {
			// Filter and sort cells that are above the cursor
			const cellsToRun = cells
				.filter(cell => cell.range.start.isBefore(cursor) && !cell.range.contains(cursor))
				.sort((a, b) => {
					if (a.range.start.line !== b.range.start.line) {
						return a.range.start.line - b.range.start.line;
					}
					return a.range.start.character - b.range.start.character;
				});
				
			for (const cell of cellsToRun) {
				await this.runCell(cell);
			}
		}
	}
	public async runCurrentAndBelow(line?: number): Promise<void> {
		const cursor = this.getCursor(line);
		const cells = this.getCells();
		if (cells) {
			for (const cell of cells) {
				if (cell.range.end.isAfter(cursor)) {
					await this.runCell(cell);
				}
			}
		}
	}

  // Movement
	public goToPreviousCell(line?: number): void {
		const cell = this.getPreviousCell(line);
		if (cell) {
			this.goToCell(cell);
		}
	}

	public goToNextCell(line?: number): void {
		const cell = this.getNextCell(line);
		if (cell) {
			this.goToCell(cell);
		}
	}

  // Inserts
	public async insertCodeCell(line?: number): Promise<void> {
		const location = this.getCurrentCell(line)?.range.end ?? this.editor.selection.active;
		await this.editor.edit(editBuilder => {
			editBuilder.insert(location, this.parser?.newCell() ?? '');
		});
		this.goToNextCell(location.line);
	}
}

export function getActiveCodeCellManager(): CodeCellManager | undefined {
	const activeEditor = vscode.window?.activeTextEditor;
	if (activeEditor && canHaveCells(activeEditor.document)) {
		return new CodeCellManager(activeEditor);
	}
	return undefined;
}
