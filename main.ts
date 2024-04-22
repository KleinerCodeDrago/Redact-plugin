import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

interface RedactorPluginSettings {
    redactedFolderPath: string;
    redactionSymbol: string;
    redactionMarker: string;
    redactionShortcut: string;
}

const DEFAULT_SETTINGS: RedactorPluginSettings = {
    redactedFolderPath: '',
    redactionSymbol: '█',
    redactionMarker: '==',
    redactionShortcut: 'Ctrl+Shift+R',
  }

export default class RedactorPlugin extends Plugin {
  settings: RedactorPluginSettings;

  async onload() {
    await this.loadSettings();

    this.addCommand({
      id: 'redact-and-extract',
      name: 'Redact and Extract',
      editorCallback: async (editor: Editor, view: MarkdownView) => {
        const fileContent = editor.getValue();
        const redactedFolderPath = this.settings.redactedFolderPath;

        if (redactedFolderPath) {
          const redactedFileContent = fileContent.replace(
            new RegExp(`${this.settings.redactionMarker}(.*?)${this.settings.redactionMarker}`, 'gs'),
            (_, text) => this.settings.redactionSymbol.repeat(text.length)
          );

          if (view.file) {
            const currentFilePath = view.file.path;
            const redactedFilePath = path.join(redactedFolderPath, currentFilePath);

            await this.createFolderIfNotExists(path.dirname(redactedFilePath));
            await fs.promises.writeFile(redactedFilePath, redactedFileContent, 'utf-8');
            new Notice(`Redacted text extracted to ${redactedFilePath}`);
          } else {
            new Notice('No active file found.');
          }
        } else {
          new Notice('Please set the redacted folder path in the plugin settings.');
        }
      }
    });

    this.addCommand({
        id: 'toggle-redaction-marker',
        name: 'Toggle Redaction Marker',
        editorCallback: (editor: Editor) => {
          const selectedText = editor.getSelection();
          const marker = this.settings.redactionMarker;
  
          if (selectedText) {
            const selectedLines = selectedText.split('\n');
            const wrappedLines = selectedLines.map(line => {
              if (line.trim() !== '') {
                return `${marker}${line}${marker}`;
              } else {
                return line;
              }
            });
            const wrappedText = wrappedLines.join('\n');
            editor.replaceSelection(wrappedText);
          } else {
            const cursor = editor.getCursor();
            editor.replaceRange(marker, { line: cursor.line, ch: cursor.ch }, { line: cursor.line, ch: cursor.ch });
            editor.setCursor({ line: cursor.line, ch: cursor.ch + marker.length });
          }
        },
        hotkeys: [
          {
            modifiers: ['Ctrl', 'Shift'],
            key: 'R',
          },
        ],
      });
  
      this.addSettingTab(new RedactorSettingTab(this.app, this));
    }
  

  async createFolderIfNotExists(folderPath: string): Promise<void> {
    if (!await this.exists(folderPath)) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }
  }

  async exists(path: string): Promise<boolean> {
    try {
      await fs.promises.access(path);
      return true;
    } catch {
      return false;
    }
  }

  onunload() {
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class RedactorSettingTab extends PluginSettingTab {
  plugin: RedactorPlugin;

  constructor(app: App, plugin: RedactorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Redacted Folder Path')
      .setDesc('Path to the folder where redacted files will be saved')
      .addText(text => text
        .setPlaceholder('Enter the redacted folder path')
        .setValue(this.plugin.settings.redactedFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.redactedFolderPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Redaction Symbol')
      .setDesc('Symbol used to replace redacted text')
      .addText(text => text
        .setPlaceholder('Enter the redaction symbol')
        .setValue(this.plugin.settings.redactionSymbol)
        .onChange(async (value) => {
          this.plugin.settings.redactionSymbol = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Redaction Marker')
      .setDesc('Marker used to indicate the start and end of redacted text')
      .addText(text => text
        .setPlaceholder('Enter the redaction marker')
        .setValue(this.plugin.settings.redactionMarker)
        .onChange(async (value) => {
          this.plugin.settings.redactionMarker = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Redaction Shortcut')
      .setDesc('Shortcut to toggle the redaction marker')
      .addText(text => text
        .setPlaceholder('Enter the redaction shortcut')
        .setValue(this.plugin.settings.redactionShortcut)
        .onChange(async (value) => {
          this.plugin.settings.redactionShortcut = value;
          await this.plugin.saveSettings();
        }));
  }
}
