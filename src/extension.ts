// extension.ts

import path from "node:path";
import * as vscode from "vscode";

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

  const documentText = document.getText();
  const firstLine = document.lineAt(0).text;

  // Check for any comment in the first line that could be a filename comment
  const isExistingFilenameComment =
    (firstLine.startsWith("//") ||
      firstLine.startsWith("/*") ||
      firstLine.startsWith("#")) &&
    fileExtensions.some((ext) => firstLine.includes(ext));

  if (isExistingFilenameComment) {
    // Replace the existing comment with the new one if they differ
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
