export class FilePicker {
    private _input: HTMLInputElement;

    constructor() {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);
        this._input = input;
    }

    activate(): Promise<File> {
        return new Promise((resolve) => {
            this._input.onchange = (e: Event) => {
                this._input.onchange = undefined;
                resolve((e.target as HTMLInputElement).files[0]);
            };
            this._input.click();
        });
    }
}
