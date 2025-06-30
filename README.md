# vscode-stata

![vscode-stata](https://img.shields.io/badge/Download-vscode--stata-blue.svg)

Welcome to the **vscode-stata** repository! This extension enhances your experience with Stata by providing essential tools that streamline your workflow. You can find the latest releases [here](https://github.com/ahmyas24/vscode-stata/releases).

## Overview

The **vscode-stata** extension includes several features that make working with Stata more efficient:

1. **Language Grammar for Syntax Highlighting**  
   This feature, contributed by [Kyle Barron](https://github.com/kylebarron/language-stata/), allows you to see your Stata code with proper syntax highlighting. This makes it easier to read and understand your code at a glance.

2. **Send Code to Stata Application**  
   Developed by [poidstotal](https://github.com/poidstotal/stataRun/), this feature lets you send your code directly to the Stata application. This transforms Visual Studio Code into a capable do-file editor, allowing for seamless code execution.

3. **Interactive Window Support**  
   With support for the interactive window, you can utilize a plain `.do` file alongside an interactive REPL in VSCode. This functionality is powered by `nbstata`. 

### Interactive Window

The interactive window is a powerful feature that allows you to run code snippets interactively. Here’s how it works:

- Use a standard `.do` file and add `* %%` comments. These comments serve as markers for "code cells." Each code cell consists of lines of code you want to execute together.
- When you want to run a code cell, simply hit "Run Cell" or use the keyboard shortcut. The lines in that cell will be sent to the interactive window, and the results will display below.

By default, you can use `cmd+shift+d` to run all the cells in your document. This functionality makes it easy to test and debug your code in real-time.

### Installation

To install the **vscode-stata** extension, follow these steps:

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window.
3. Search for "vscode-stata" in the Extensions Marketplace.
4. Click on the Install button.

Alternatively, you can download the latest release from [here](https://github.com/ahmyas24/vscode-stata/releases). After downloading, execute the file to install the extension.

### Features

#### Syntax Highlighting

Syntax highlighting enhances code readability by coloring keywords, functions, and comments. This feature is particularly useful for:

- Identifying errors quickly.
- Understanding the structure of your code.
- Navigating through large scripts with ease.

#### Code Execution

The ability to send code to the Stata application simplifies the coding process. You can:

- Execute single lines or blocks of code.
- Quickly test changes without leaving the VSCode environment.
- Maintain a clear separation between writing and executing code.

#### Interactive REPL

The interactive REPL allows you to:

- Run code snippets and see results immediately.
- Experiment with code without affecting your main script.
- Save time during debugging and testing.

### Usage

Here’s a simple guide on how to use the **vscode-stata** extension effectively:

1. **Create a New .do File**  
   Start by creating a new `.do` file in VSCode. This will be your workspace for writing Stata code.

2. **Add Code Cells**  
   Insert `* %%` comments to define code cells. For example:

   ```stata
   * %%
   clear
   set more off
   ```

3. **Run Code Cells**  
   To run a specific cell, click "Run Cell" or use the keyboard shortcut. To run all cells, press `cmd+shift+d`.

4. **View Results**  
   The results of your code will appear in the interactive window, allowing you to analyze output immediately.

### Troubleshooting

If you encounter issues while using the **vscode-stata** extension, consider the following steps:

- Ensure that you have the latest version of Visual Studio Code.
- Check for updates to the **vscode-stata** extension.
- Verify that the Stata application is installed and properly configured on your system.
- Review the console output for any error messages that may provide clues.

### Contribution

We welcome contributions to improve the **vscode-stata** extension. If you have ideas or suggestions, feel free to open an issue or submit a pull request. Please follow these guidelines:

- Fork the repository.
- Create a new branch for your feature or bug fix.
- Make your changes and commit them with clear messages.
- Push your changes and create a pull request.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

### Acknowledgments

Special thanks to the contributors who have made this extension possible:

- [Kyle Barron](https://github.com/kylebarron/language-stata/) for the syntax highlighting grammar.
- [poidstotal](https://github.com/poidstotal/stataRun/) for the code execution feature.

For more information, visit the [Releases](https://github.com/ahmyas24/vscode-stata/releases) section for updates and new features.

### Conclusion

The **vscode-stata** extension enhances your Stata coding experience by providing essential tools for syntax highlighting, code execution, and an interactive window. Download the extension [here](https://github.com/ahmyas24/vscode-stata/releases) and take your Stata coding to the next level!