import { InputSourceSemanticType } from "../types/bindingTypes";
import { InputEventEntry, InputSource, InputType } from "../types/InputSource";

export type EventList<M> = {
    [event in keyof M]?: (event: M[event]) => void;
};

export abstract class HTMLEventInputSource implements InputSource {
    constructor(protected canvas: HTMLCanvasElement) {
        this.#bindOrUnbind("addEventListener");
        this.poll();
    }
    abstract readonly semType: InputSourceSemanticType;
    abstract options: InputSource["options"];
    #queues!: { [K in InputType]: InputEventEntry<K>[] };
    poll(): { [K in InputType]: InputEventEntry<K>[] } {
        const temp = this.#queues;
        this.#queues = {
            [InputType.SCALAR]: [],
            [InputType.DIRECTION]: [],
            [InputType.POINTER]: [],
        };
        return temp;
    }
    protected queue<T extends InputType>(type: T, data: InputEventEntry<T>) {
        this.#queues[type].push(data);
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
