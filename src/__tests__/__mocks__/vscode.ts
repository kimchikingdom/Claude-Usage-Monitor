export const window = {
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn()
  })),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  createStatusBarItem: jest.fn(() => ({
    text: '',
    tooltip: '',
    command: '',
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn()
  })),
  registerTreeDataProvider: jest.fn(),
  registerWebviewViewProvider: jest.fn(),
  createTerminal: jest.fn(() => ({
    show: jest.fn(),
    sendText: jest.fn()
  }))
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn()
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn()
  })),
  onDidChangeConfiguration: jest.fn()
};

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2
}

export class TreeItem {
  label: string;
  collapsibleState?: TreeItemCollapsibleState;
  constructor(label: string, collapsibleState?: TreeItemCollapsibleState) {
    this.label = label;
    this.collapsibleState = collapsibleState;
  }
}

export class EventEmitter {
  private _event: any = jest.fn();
  get event() { return this._event; }
  fire = jest.fn();
  dispose = jest.fn();
}

export class Uri {
  static file(path: string) { return { fsPath: path, scheme: 'file' }; }
  static parse(value: string) { return { fsPath: value, scheme: 'file' }; }
}
