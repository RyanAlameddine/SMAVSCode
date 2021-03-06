'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
function promisifyReadFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}
exports.promisifyReadFile = promisifyReadFile;
class SMAProvider {
    constructor(opCodes) {
        this.opCodeCompletionItems = new vscode.CompletionList();
        this.opCodes = opCodes;
        for (let key in opCodes) {
            this.opCodeCompletionItems.items.push(this.createSnippetItem(key, opCodes[key]));
        }
        let progSpace = new vscode.CompletionItem("progspace", vscode.CompletionItemKind.Snippet);
        progSpace.insertText = new vscode.SnippetString("$---$\n");
        progSpace.documentation = new vscode.MarkdownString(`## $---$\n\n *** \n\nMarks the beginning of program space`);
        this.opCodeCompletionItems.items.push(progSpace);
    }
    static async Create(jsonPath) {
        const content = await promisifyReadFile(jsonPath);
        const js = JSON.parse(content);
        const provider = new SMAProvider(js);
        return provider;
    }
    lineOf(text, count) {
        var line = 0;
        for (var i = 0; i < text.length; i++) {
            if (i == count) {
                return line + 1;
            }
            if (text[i] === '\n') {
                line++;
            }
        }
        return -1;
    }
    getLabelChar(document, name) {
        return document.getText().search(new RegExp('\\b' + name + ':'));
    }
    getDescription(label, opCode) {
        let paramString = '';
        for (let param of opCode.params) {
            paramString += `*@params* \`${param.name}\`: ${param.type}\n\n`;
        }
        return `OpCode **${label}**: ${opCode.name}\n\n *** \n\n${opCode.description}\n\n${paramString}`;
    }
    provideHover(document, position, token) {
        const range = document.getWordRangeAtPosition(position);
        if (!range)
            return;
        const text = document.getText(range);
        //registers
        if (/r[0-9A-F]/.test(text)) {
            let hexString = parseInt(text[1], 16);
            return new vscode.Hover('Register ' + hexString);
        }
        const opCode = this.opCodes[text];
        //opCodes
        if (opCode) {
            return new vscode.Hover(this.getDescription(text.toLowerCase(), opCode));
        }
        //Hex
        if (/[0-9A-F]+(_)([0-9A-F])/.test(text)) {
            let hex = text.replace('_', '');
            let hexValue = parseInt(hex, 16);
            return new vscode.Hover(`Hex value: ${hexValue.toString(16)}\n\nDec value: ${hexValue}`);
        }
        //label
        const line = this.lineOf(document.getText(), this.getLabelChar(document, text));
        if (line != -1) {
            return new vscode.Hover(`Label: **${text}**\n\nLinks to line ` + line);
        }
        return new vscode.Hover('Not found');
    }
    provideCompletionItems(document, position, token, context) {
        return this.opCodeCompletionItems;
    }
    createSnippetItem(label, opCode) {
        let item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);
        let paramString = '';
        let counter = 0;
        for (let param of opCode.params) {
            counter++;
            if (param.type == "Register") {
                paramString += "r${" + counter + ":0} ";
            }
            else if (param.type == "Short") {
                counter++;
                paramString += "${" + counter + ":00_00} ";
            }
        }
        paramString = paramString.slice(0, paramString.length - 1);
        counter = 3 - counter;
        for (var i = 0; i < counter; i++) {
            paramString += "   ";
        }
        if (counter == 3) {
            paramString = paramString.substring(0, paramString.length - 1);
        }
        if (label.length == 2)
            label += "  ";
        else if (label.length == 3)
            label += " ";
        item.insertText = new vscode.SnippetString(label + `[${paramString}] `);
        item.documentation = new vscode.MarkdownString(this.getDescription(label, opCode));
        return item;
    }
    dispose() {
    }
}
async function activate(context) {
    console.log('Congratulations, your extension "sma" is now active!');
    const jsonPath = path.join(context.extensionPath, 'resources', 'opCodes.json');
    const prov = await SMAProvider.Create(jsonPath);
    vscode.languages.registerHoverProvider('sma', prov);
    vscode.languages.registerCompletionItemProvider('sma', prov);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map