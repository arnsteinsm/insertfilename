# Insert Filename as Comment

Insert Filename as Comment is a Visual Studio Code extension that automatically inserts a commented-out version of the file name at the top of files when they are saved.

## Features

- Automatically inserts a commented-out file name (with or without path) at the top of files on save.
- Supports customization for file extensions and comment style.
- Avoids overwriting existing comments or manually added file name references.
- Compatible with Visual Studio Code's built-in save functionality.
- Inspired by the need to easily copy and paste file names into AI platforms.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the square icon in the sidebar.
3. Search for "Insert Filename as Comment" and click on Install.

## Usage

- Save a file, and the extension will insert a commented-out file name at the top of the document if it doesn't already exist or if settings have changed.

## Configuration

Customize this extension through the following settings in your VS Code settings:

- `insertFilename.fileExtensions`: Specifies the file extensions where the filename comment will be added on save. Default extensions include `.js`, `.jsx`, `.ts`, and `.tsx`.
- `insertFilename.commentStyle`: Choose the comment style (`//`, `/* */`, or `#`) for the filename comment. Defaults to `//`.
- `insertFilename.usePath`: If set to `true`, the (workspace) relative path to the file is included in the comment. If `false`, only the filename is added. Defaults to `false`.

## Issues and Feedback

- If you encounter any issues or have suggestions for improvements, please [open an issue](https://github.com/arnsteinsm/insertfilename/issues) on GitHub.

## License

This project is licensed under the [MIT License](LICENSE).
