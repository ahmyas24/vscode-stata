/*---------------------------------------------------------------------------------------------
 *  Copyright (C) 2023 Posit Software, PBC. All rights reserved.
 *  Licensed under the Elastic License 2.0. See LICENSE.txt for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface Cell {
	range: vscode.Range;
	type: CellType;
}

export enum CellType {
	Code,
	Markdown,
}

export interface CellParser {
	isCellStart(line: string): boolean;
	isCellEnd(line: string): boolean;
	getCellType(line: string): CellType;
	getCellText(cell: Cell, document: vscode.TextDocument): string;
	newCell(): string;
}

function getCellText(cell: Cell, document: vscode.TextDocument): string {
	if (cell.range.start.line >= cell.range.end.line) {
		return '';
	}
	// Skip the cell marker line
	const range = new vscode.Range(
		cell.range.start.line + 1,
		cell.range.start.character,
		cell.range.end.line,
		cell.range.end.character
	);
	return document.getText(range);
}

// Spaces can not occur before *
const stataIsCellStartRegExp = new RegExp(/^\*\s*(%%)/);

const stataCellParser: CellParser = {
	isCellStart: (line) => stataIsCellStartRegExp.test(line),
	isCellEnd: (_line) => false,
	getCellType: (_line) => CellType.Code,
	getCellText: getCellText,
	newCell: () => '\n* %%\n'
};

export const parsers: Map<string, CellParser> = new Map([
	['stata', stataCellParser],
]);
export const supportedLanguageIds = Array.from(parsers.keys());

export function getParser(languageId: string): CellParser | undefined {
	return parsers.get(languageId);
}

// This function was adapted from the vscode-jupyter extension.
export function parseCells(document: vscode.TextDocument): Cell[] {
	const parser = getParser(document.languageId);
	if (!parser) {
		return [];
	}

	const cells: Cell[] = [];
	let currentStart: vscode.Position | undefined;
	let currentType: CellType | undefined;
	
	for (let index = 0; index < document.lineCount; index += 1) {
		const line = document.lineAt(index);

		if (parser.isCellStart(line.text)) {
			// Close the previous cell if it exists
			if (currentStart !== undefined && currentType !== undefined) {
				const previousEnd = document.lineAt(index - 1).range.end;
				cells.push({ range: new vscode.Range(currentStart, previousEnd), type: currentType });
			}

			// Start a new cell
			currentStart = line.range.start;
			currentType = parser.getCellType(line.text);
		}

		// Handle the last cell when we reach the end of the document
		if (index === document.lineCount - 1 && currentStart !== undefined && currentType !== undefined) {
			const lastEnd = document.lineAt(index).range.end;
			cells.push({ range: new vscode.Range(currentStart, lastEnd), type: currentType });
		}
	}

	// Sort cells by their start position to ensure they're in document order
	return cells.sort((a, b) => {
		if (a.range.start.line !== b.range.start.line) {
			return a.range.start.line - b.range.start.line;
		}
		return a.range.start.character - b.range.start.character;
	});
}
