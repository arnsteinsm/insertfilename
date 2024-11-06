import * as vscode from "vscode";
import * as path from "path";

export function activate() {
	vscode.workspace.onWillSaveTextDocument((event) => {
		insertCommentOnSave(event.document);
	});
}

function insertCommentOnSave(document: vscode.TextDocument) {
	const editor = vscode.window.activeTextEditor;
	if (!editor || editor.document !== document) {
		return;
	}

	const config = vscode.workspace.getConfiguration("insertFilename");
	const usePath = config.get<boolean>("usePath", false);
	const commentStyle = config.get<string>("commentStyle", "//");
	const fileExtensions = config.get<string[]>("fileExtensions", [
		".js",
		".jsx",
		".ts",
		".tsx",
	]);

	const filePath = document.fileName;
	const filename = path.basename(filePath);
	const relativePath = vscode.workspace.asRelativePath(filePath);
	const displayPath = usePath ? relativePath : filename;
	const fileExtension = path.extname(filePath);

	if (!fileExtensions.includes(fileExtension)) {
		return;
	}

	// Define the comment text based on the comment style
	let commentText = "";
	switch (commentStyle) {
		case "//":
			commentText = `// ${displayPath}\n\n`;
			break;
		case "/* */":
			commentText = `/* ${displayPath} */\n\n`;
			break;
		case "#":
			commentText = `# ${displayPath}\n\n`;
			break;
		default:
			commentText = `// ${displayPath}\n\n`; // Fallback
	}

	const firstLine = document.lineAt(0).text;

	// Check if the existing comment matches the current display path
	const isFilenameComment =
		(firstLine.startsWith("//") ||
			firstLine.startsWith("/*") ||
			firstLine.startsWith("#")) &&
		firstLine.includes(displayPath);

	if (isFilenameComment) {
		// Replace the comment only if it's different from the current commentText
		if (firstLine !== commentText.trim()) {
			editor.edit((editBuilder) => {
				const firstLineRange = document.lineAt(0).range;
				editBuilder.replace(firstLineRange, commentText.trim());
			});
		}
	} else {
		// Insert the new comment at the top if no existing matching comment
		editor.edit((editBuilder) => {
			const position = new vscode.Position(0, 0);
			editBuilder.insert(position, commentText);
		});
	}
}
