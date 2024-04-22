import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { normalize } from 'path';

interface RedactorPluginSettings {
  redactedVaultPath: string;
  redactionSymbol: string;
  redactionMarker: string;
}

const DEFAULT_SETTINGS: RedactorPluginSettings = {
  redactedVaultPath: '',
  redactionSymbol: '█',
  redactionMarker: '==',
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
        const redactedVaultPath = normalize(this.settings.redactedVaultPath);

        if (redactedVaultPath) {
          const redactedFileContent = fileContent.replace(
            new RegExp(`${this.settings.redactionMarker}(.*?)${this.settings.redactionMarker}`, 'gs'),
            (_, text) => this.settings.redactionSymbol.repeat(text.length)
          );

          const redactedFilePath = `${redactedVaultPath}/${view.file.name}`;

          try {
            await this.app.vault.adapter.write(redactedFilePath, redactedFileContent);
            new Notice(`Redacted text extracted to ${redactedFilePath}`);
          } catch (error) {
            console.error('Error extracting redacted text:', error);
            new Notice('An error occurred while extracting the redacted text. Please check the console for more details.');
          }
        } else {
          new Notice('Please set the redacted vault path in the plugin settings.');
        }
      }
    });

    this.addSettingTab(new RedactorSettingTab(this.app, this));
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
      .setName('Redacted Vault Path')
      .setDesc('Absolute path to the vault where redacted text will be extracted')
      .addText(text => text
        .setPlaceholder('Enter the redacted vault path')
        .setValue(this.plugin.settings.redactedVaultPath)
        .onChange(async (value) => {
          this.plugin.settings.redactedVaultPath = value;
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
  }
}
