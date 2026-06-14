import { InputSource } from "./InputSource";

export type EventList<M> = {
    [event in keyof M]?: (event: M[event]) => void;
};

export abstract class HTMLEventInputSource extends InputSource {
    constructor(protected canvas: HTMLCanvasElement) {
        super();
    }
    protected bind() {
        this.#bindOrUnbind("addEventListener");
    }
    protected canvasEv: EventList<HTMLElementEventMap> = {};
    protected docEv: EventList<DocumentEventMap> = {};
    protected winEv: EventList<WindowEventMap> = {};
    destroy() {
        this.#bindOrUnbind("removeEventListener");
    }
    #bindOrUnbind(key: "addEventListener" | "removeEventListener") {
        bindOrUnbindOne(this.canvas, key, this.canvasEv);
        bindOrUnbindOne(document, key, this.docEv);
        bindOrUnbindOne(window, key, this.winEv);
    }
}

const bindOrUnbindOne = (obj: Document | Window | HTMLElement, key: "addEventListener" | "removeEventListener", entries: EventList<any>) => {
    for (const { 0: name, 1: handler } of Object.entries(entries)) {
        obj[key](name, handler as EventListener);
    }
};
