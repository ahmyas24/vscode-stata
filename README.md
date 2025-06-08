# `vscode-stata`: Language tools for Stata

This extension contains a set of tools for working with Stata:

1. Language grammar for syntax highlighting (from [Kyle Barron](https://github.com/kylebarron/language-stata/))
2. Ability to send code to the Stata application (from [poidstotal](https://github.com/poidstotal/stataRun/))
   - This feature makes VSCode effectively a do file editor
3. [Interactive window](https://code.visualstudio.com/docs/python/jupyter-support-py) support using `nbstata`. See below


## Interactive window

Interactive window allows you to use a plain `.do` file and have an interactive REPL in VSCode.
The idea is that you take your regular `.do` file and sprinkle in `* %%` comments. 
These comments will mark "code cells" which are set of lines of code that you want to run all together.
When you hit Run Cell (or use a keyboard shortcut), then those lines are sent to the interactive window and the results are displayed below.

By default you can use `cmd+shift+d` to run all the cells (in order) and `cmd+enter` to run the current cell and move to the next cell.
I recommend adding two more keyboard shortcuts (`cmd+[` for Go to Previous Cell and `cmd+]` for Go to Next Cell). 
This allows you to jump around the do file according to your cell markers

![Picture showcasing interactive window. On the left is a sample `.do` file with a set of code cells demarkated by `* %%`. On the right is output from the `.do` file following the same separation as the file itself](demos/interactive-window-demo.png)


### Installing necessary software

This feature uses the [`nbstata`](https://hugetim.github.io/nbstata/) jupyter kernel by [Tim Huegerich](https://github.com/hugetim/). 
- I used code from [`stata-mcp`](https://github.com/hanlulong/stata-mcp) that will automatically install `uv` (to manage python packages) and setup `nbstata`. If you run in to any issues, see https://github.com/hanlulong/stata-mcp/tree/main?tab=readme-ov-file#python-environment-management



## Send code to stata

These commands allow you to execute Stata code directly from VSCode without switching applications. 
You can either set up keyboard shortcuts or use the command palette (launch with `cmd+shift+p` and then search Send to Stata)
There are four commands for sending code to Stata:

- `Send to Stata: All Lines` Sends the entire file to Stata (`cmd + shift + d`)
- `Send to Stata: Selection / Current Line` Sends the currently selected text to Stata. If no text is selected, then the current line is sent (`cmd + enter`)
- `Send to Stata: Above Lines` Sends all code above the curso
- `Send to Stata: Current Line and Below` Sends all the code on the same line as the cursor and below




## Credits 

This repository uses a lot of code MIT licensed language-stata by [Kyle Barron](https://github.com/kylebarron/language-stata/) [![GitHub stars](https://img.shields.io/github/stars/kylebarron/language-stata.svg?style=social&label=Star)](https://github.com/kylebarron/language-stata), [poidstotal](https://github.com/poidstotal/stataRun/) [![GitHub stars](https://img.shields.io/github/stars/poidstotal/stataRun.svg?style=social&label=Star)](https://github.com/poidstotal/stataRun/), and [Han Lu Long](https://github.com/hanlulong/stata-mcp) [![GitHub stars](https://img.shields.io/github/stars/hanlulong/stata-mcp.svg?style=social&label=Star)](https://github.com/hanlulong/stata-mcp/) into a single extension. 

Please give a star to each project to say thanks! 


