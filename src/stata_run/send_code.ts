// stataRun
// Send code to an open stata window. This makes VSCode effectively the do file editor

import * as vscode from "vscode";
import { exec } from "child_process";
import { writeFile } from "fs";
import { tmpdir } from "os";
import path from "path";
import { Logger } from "../logging";

var config = vscode.workspace.getConfiguration("vscode-stata");

function checkEditor(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    let mgs = "No editor is opened. Open a compatible file and try again";
    vscode.window.showWarningMessage(mgs);
  } else {
    return editor;
  }
}
function showEmptyEditorError() {
  let mgs = "The editor look empty, please add some stata code";
  vscode.window.showErrorMessage(mgs);
}

export function sendCodeToStata(code: string) {
  if (code) {
    var filePath = `${tmpdir()}/StataRun-${Date.now()}.do`;
    writeFile(filePath, code + "\n", (err) => {
      if (err) {
        throw err;
      }
    });

    switch (process.platform) {
      case "darwin":
        return sendMac(`do ${filePath}`);
      case "linux":
        return sendLinux(`do ${filePath}`);
      case "win32":
        vscode.window.showErrorMessage(
          "I did not implement windows platform support; PRs welcome!"
        );
        return;
      default:
        vscode.window.showErrorMessage("Unsupported platform");
        return;
    }
  } else {
    vscode.window.showWarningMessage("Document is empty");
  }
}

// Send code to stata application
export const sendAll = () => {
  Logger.info("Trying to send all code to stata");
  // Run Full file
  let editor = checkEditor(vscode.window.activeTextEditor);
  if (editor) {
    let code = editor.document.getText();
    if (code.length > 0) {
      // If document is unsaved, then save temp file and run the do-file
      if (editor.document.isUntitled) {
        sendCodeToStata(code);
      }
      // Else just run the do-file
      else {
        var cwd = editor.document.uri.fsPath;
        sendCodeToStata('do `"' + cwd + "\"'");
      }
    } else {
      showEmptyEditorError();
    }
  }
};

export const sendAbove = () => {
  // Run above the current line
  let editor = checkEditor(vscode.window.activeTextEditor);
  if (editor) {
    const position = editor.selection.active.line;
    const first = new vscode.Position(0, 0);
    const lastpos = editor.document.lineAt(position - 1);
    const last = new vscode.Position(position - 1, lastpos.range.end.character);

    if (position > 0) {
      const range = new vscode.Range(first, last);
      var code = editor.document.getText(range);
      sendCodeToStata(code);
    } else {
      showEmptyEditorError();
    }
  }
};

export const sendCurrentAndBelow = () => {
  // Run the current line and below
  let editor = checkEditor(vscode.window.activeTextEditor);
  if (editor) {
    const position = editor.selection.active.line;
    const lines = editor.document.lineCount - 1;
    const first = new vscode.Position(position, 0);
    const lastpos = editor.document.lineAt(lines);
    const last = new vscode.Position(lines, lastpos.range.end.character);

    if (first !== last) {
      const range = new vscode.Range(first, last);
      var code = editor.document.getText(range);
      sendCodeToStata(code);
    } else {
      showEmptyEditorError();
    }
  }
};

export const sendSelectionOrCurrentLine = () => {
  // Run selection if active, otherwise run current line
  let editor = checkEditor(vscode.window.activeTextEditor);
  if (editor) {
    let selection = editor.selection;
    let code: string;

    // Check if there's an active selection (text is highlighted)
    if (!selection.isEmpty) {
      // Run selected text
      code = editor.document.getText(selection);
    } else {
      // Run current line
      const position = editor.selection.active;
      const first = new vscode.Position(position.line, 0);
      const lastpos = editor.document.lineAt(position.line);
      const last = new vscode.Position(
        position.line,
        lastpos.range.end.character
      );
      const range = new vscode.Range(first, last);
      code = editor.document.getText(range);
    }

    if (code && code.trim().length > 0) {
      sendCodeToStata(code);
    } else {
      showEmptyEditorError();
    }
  }
};

// use applescript to send command to stata
function sendMac(text: string) {
  text = escapeStringAppleScript(text);
  var whichApp = config.get("whichApp");

  if (text.length > 8192) {
    vscode.window.showErrorMessage("Code to send must be <= 8192 characters");
    return;
  }

  const focusWindow = config.get("focusWindow");
  if (focusWindow) {
    tellApple(`tell application "${whichApp}" to activate\n`);
  }
  tellApple(`tell application "${whichApp}" to DoCommandAsync "${text}"\n`);
}
function escapeStringAppleScript(string: string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a string, got ${typeof string}`);
  }
  return string.replace(/[\\"]/g, "\\$&");
}
async function tellApple(cmd: string) {
  const { runAppleScript } = await import("run-applescript");
  runAppleScript(cmd)
    .then(() => {
      return console.log("Applescript: ", cmd);
    })
    .catch((err) => {
      console.error(err);
      return console.error("Error running applescript command:\n", cmd);
    });
}

function sendLinux(text: string) {
  // The `keyup ctrl` is the most important part of this
  //
  // The --clearmodifiers flag doesn't work great. By default, I have most of
  // the run keys bound with a `ctrl` key. I.e. to run a line of code you'd
  // type `ctrl+enter`. But when `ctrl` is held down by the user, running
  // `ctrl+v` pastes only `v`, and doesn't paste the clipboard. To prevent
  // against this, I use `keyup ctrl`, which forces the beginning position of
  // `ctrl` to be not pressed, regardless of what the user is doing.
  var cmd = `
      old_cb="$(xclip -o -selection clipboard)";
      this_window="$(xdotool getactivewindow)" &&
      stata_window="$(xdotool search --name --limit 1 "Stata/(IC|SE|MP)? 1[0-9].[0-9]")" &&
      cat ~/.stataRun_code | xclip -i -selection clipboard &&
      xdotool \
        keyup ctrl shift \
        windowactivate --sync $stata_window \
        key --clearmodifiers --delay 100 ctrl+v Return \
        windowactivate --sync $this_window;
      printf "$old_cb" | xclip -i -selection clipboard
  `;

  const homeDir = process.env.HOME;
  if (!homeDir) {
    vscode.window.showErrorMessage("HOME environment variable is not set.");
    return;
  }
  var codepath = path.join(homeDir, ".stataRun_code");
  writeFile(codepath, text, (err) => {
    if (err) {
      console.log(err);
      vscode.window.showErrorMessage(
        "Home directory not writeable. Check permissions"
      );
      return;
    }

    console.log("The file was saved!");
    exec(cmd, (err, stdout, stderr) => {
      console.log("stdout: " + stdout);
      console.log("stderr: " + stderr);
      if (err) {
        throw err;
      }
    });
  });
}
