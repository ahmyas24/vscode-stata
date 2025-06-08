import vscode from "vscode";
import path from "path";
import fs from "fs";
import { Logger } from "./logging";

let globalContext: vscode.ExtensionContext | undefined = undefined;
export function setupFileUtils(context: vscode.ExtensionContext) {
  globalContext = context;
}

export const FileUtils = {
  getExtensionFilePath: (filename: string) => {
    const extensionPath = globalContext?.extensionPath || __dirname;
    return path.join(extensionPath, filename);
  },

  readFileContent: (filePath: string) => {
    try {
      return fs.readFileSync(filePath, "utf8").trim();
    } catch (error: any) {
      Logger.error(`Error reading file ${filePath}: ${error.message}`);
      return null;
    }
  },

  writeFileContent: (filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content);
      return true;
    } catch (error: any) {
      Logger.error(`Error writing file ${filePath}: ${error.message}`);
      return false;
    }
  }
};
