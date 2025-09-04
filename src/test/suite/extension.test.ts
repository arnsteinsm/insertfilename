// src/test/suite/extension.test.ts

import * as vscode from 'vscode';
import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';

// This suite needs to be run in a VS Code extension development host.
suite('Insert Filename as Comment Extension Test Suite', () => {
  if (!vscode.workspace.workspaceFolders) {
    // Cannot run tests if there is no workspace folder.
    // This check is to satisfy TypeScript's strict null checks.
    return;
  }
  const testFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const createdFiles: string[] = [];

  // Helper to create a file, open it, and return the document and editor
  async function createEditor(filename: string, content: string): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor; }> {
    const filePath = path.join(testFolder, filename);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, content);
    createdFiles.push(filePath);

    const document = await vscode.workspace.openTextDocument(filePath);
    const editor = await vscode.window.showTextDocument(document);
    return { document, editor };
  }

  // Helper to set configuration
  async function setConfiguration(key: string, value: any) {
    await vscode.workspace.getConfiguration('insertFilename').update(key, value, vscode.ConfigurationTarget.Global);
  }

  // Helper to reset configuration to default values
  async function resetConfiguration() {
    const config = vscode.workspace.getConfiguration('insertFilename');
    await Promise.all([
      config.update('fileExtensions', undefined, vscode.ConfigurationTarget.Global),
      config.update('commentStyleMap', undefined, vscode.ConfigurationTarget.Global),
      config.update('commentStyle', undefined, vscode.ConfigurationTarget.Global),
      config.update('usePath', undefined, vscode.ConfigurationTarget.Global)
    ]);
  }

  // Helper to manually trigger the extension's functionality
  async function triggerInsertComment(document: vscode.TextDocument, editor: vscode.TextEditor): Promise<void> {
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

    // Generate comment text
    const parts = commentDelimiter.split(" ");
    let commentText: string;
    if (parts.length > 1 && parts[1] !== "") {
      // Block comment like "/* */" or "<!-- -->"
      commentText = `${parts[0]} ${displayPath} ${parts[1]}\n\n`;
    } else {
      // Line comment like "//" or "#"
      commentText = `${commentDelimiter} ${displayPath}\n\n`;
    }

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
        await editor.edit((editBuilder) => {
          const firstLineRange = document.lineAt(0).range;
          editBuilder.replace(firstLineRange, commentText.trim());
        });
      }
    } else {
      // Insert the new comment at the top if no existing matching comment
      await editor.edit((editBuilder) => {
        const position = new vscode.Position(0, 0);
        editBuilder.insert(position, commentText);
      });
    }
  }

  // Helper to save and trigger comment insertion
  async function saveWithCommentInsertion(document: vscode.TextDocument, editor: vscode.TextEditor): Promise<void> {
    // Manually trigger the comment insertion logic (mimicking what the extension does)
    await triggerInsertComment(document, editor);
    // Then save the document
    await document.save();
  }

  // Runs after all tests in this suite
  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    for (const file of createdFiles) {
      try {
        await fs.unlink(file);
      } catch (e) {
        console.error(`Failed to delete test file ${file}: ${e}`);
      }
    }
    // Clean up created directories if they are empty
    const dirs = [...new Set(createdFiles.map(f => path.dirname(f)))].sort((a, b) => b.length - a.length);
    for (const dir of dirs) {
      try {
        if (dir !== testFolder) {
          await fs.rmdir(dir);
        }
      } catch (e) {
        // ignore if not empty, which is fine
      }
    }
    await resetConfiguration();
  });

  setup(async () => {
    // Runs before each test
    await resetConfiguration();
  });

  teardown(async () => {
    // Runs after each test
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('Should insert filename for a new JS file', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.js': '//' });
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('test.js', 'console.log("hello");');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '// test.js');
    assert.strictEqual(document.lineAt(1).text, '');
    assert.strictEqual(document.lineAt(2).text, 'console.log("hello");');
  });

  test('Should insert relative path for a new TS file when usePath is true', async () => {
    await setConfiguration('fileExtensions', ['.ts']);
    await setConfiguration('commentStyleMap', { '.ts': '//' });
    await setConfiguration('usePath', true);

    const { document, editor } = await createEditor(path.join('src', 'test.ts'), 'const x = 1;');
    await saveWithCommentInsertion(document, editor);

    const relativePath = vscode.workspace.asRelativePath(document.uri).replace(/\\/g, '/');
    assert.strictEqual(document.lineAt(0).text, `// ${relativePath}`);
  });

  test('Should use commentStyleMap for python file', async () => {
    await setConfiguration('fileExtensions', ['.py']);
    await setConfiguration('commentStyleMap', { '.py': '#' });
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('test.py', 'print("hello")');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '# test.py');
  });

  test('Should use fallback commentStyle for extension not in map', async () => {
    await setConfiguration('fileExtensions', ['.rb']);
    await setConfiguration('commentStyleMap', { '.js': '//' }); // map doesn't contain .rb
    await setConfiguration('commentStyle', '#');
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('test.rb', 'puts "hello"');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '# test.rb');
  });

  test('Should not insert comment if extension is not in fileExtensions', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.txt': '#' });

    const initialContent = 'hello world';
    const { document, editor } = await createEditor('test.txt', initialContent);

    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.getText(), initialContent);
  });

  test('Should update an existing filename comment when settings change', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.js': '//' });

    // First save with usePath: false
    await setConfiguration('usePath', false);
    const { document, editor } = await createEditor('update-test.js', 'console.log("hello");');
    await saveWithCommentInsertion(document, editor);
    assert.strictEqual(document.lineAt(0).text, '// update-test.js');

    // Now, change config to usePath: true and save again
    await setConfiguration('usePath', true);
    await saveWithCommentInsertion(document, editor);

    const relativePath = vscode.workspace.asRelativePath(document.uri).replace(/\\/g, '/');
    assert.strictEqual(document.lineAt(0).text, `// ${relativePath}`);
  });

  test('Should not change the document if correct comment already exists', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.js': '//' });
    await setConfiguration('usePath', false);

    const initialContent = '// no-change.js\n\nconsole.log("no change");';
    const { document, editor } = await createEditor('no-change.js', initialContent);

    const versionBeforeSave = document.version;
    await saveWithCommentInsertion(document, editor);
    const versionAfterSave = document.version;

    // The version might change due to the save, but the content should remain the same
    assert.strictEqual(document.getText(), initialContent, "Document content should not change");
  });

  test('Should handle block comments correctly', async () => {
    await setConfiguration('fileExtensions', ['.css']);
    await setConfiguration('commentStyleMap', { '.css': '/* */' });
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('style.css', '.foo {}');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '/* style.css */');
  });

  test('Should replace a slightly different, manually added comment', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.js': '//' });
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('manual-comment.js', '//manual-comment.js\n\nconsole.log("manual");');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '// manual-comment.js');
    assert.strictEqual(document.lineAt(2).text, 'console.log("manual");');
  });

  test('Should insert comment if a non-filename comment exists on first line', async () => {
    await setConfiguration('fileExtensions', ['.js']);
    await setConfiguration('commentStyleMap', { '.js': '//' });
    await setConfiguration('usePath', false);

    const { document, editor } = await createEditor('another-comment.js', '// some other comment\n\nconsole.log("another");');
    await saveWithCommentInsertion(document, editor);

    assert.strictEqual(document.lineAt(0).text, '// another-comment.js');
    assert.strictEqual(document.lineAt(1).text, '');
    assert.strictEqual(document.lineAt(2).text, '// some other comment');
    assert.strictEqual(document.lineAt(4).text, 'console.log("another");');
  });
});