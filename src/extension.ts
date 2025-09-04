// src/extension.ts

import path from "node:path";
import * as vscode from "vscode";

export function activate() {
  vscode.workspace.onWillSaveTextDocument((event) => {
    insertCommentOnSave(event.document);
  });
}

function getCommentText(displayPath: string, commentDelimiter: string): string {
  const parts = commentDelimiter.split(" ");
  if (parts.length > 1 && parts[1] !== "") {
    // Block comment like "/* */" or "<!-- -->"
    return `${parts[0]} ${displayPath} ${parts[1]}\n\n`;
  }
  // Line comment like "//" or "#"
  return `${commentDelimiter} ${displayPath}\n\n`;
}

async function insertCommentOnSave(document: vscode.TextDocument) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document !== document) {
    return;
  }

  const config = vscode.workspace.getConfiguration("insertFilename");
  const fileExtensions = config.get<string[]>("fileExtensions", []);

  const filePath = document.fileName;
  const fileExtension = path.extname(filePath);

  if (!fileExtensions.includes(fileExtension)) {
    return;
  }

  const commentStyleMap = config.get<{ [key: string]: string; }>("commentStyleMap", {});
  let commentDelimiter: string | undefined = commentStyleMap[fileExtension];

  if (!commentDelimiter) {
    // Fallback to the old setting if no mapping for the current file extension
    commentDelimiter = config.get<string>("commentStyle");
  }

  if (!commentDelimiter) {
    // No comment style configured for this file type, so do nothing.
    return;
  }

  const usePath = config.get<boolean>("usePath", false);
  const filename = path.basename(filePath);
  const relativePath = vscode.workspace.asRelativePath(filePath);
  const displayPath = usePath ? relativePath : filename;

  const commentText = getCommentText(displayPath, commentDelimiter);
  const firstLine = document.lineAt(0).text;

  // Check for any comment in the first line that could be a filename comment
  const allPossibleDelimiters = new Set(Object.values(commentStyleMap));
  const fallbackStyle = config.get<string>("commentStyle");
  if (fallbackStyle) { allPossibleDelimiters.add(fallbackStyle); }
  const commentStarters = [...allPossibleDelimiters].map((d) => d.split(" ")[0]);

  const isExistingFilenameComment =
    commentStarters.some((starter) => firstLine.startsWith(starter)) &&
    (firstLine.includes(filename) || firstLine.includes(relativePath));

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
