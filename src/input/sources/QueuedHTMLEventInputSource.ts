import { HTMLEventInputSource } from "./HTMLEventInputSource";
import { InputEventEntry, InputType } from "./InputSource";
export abstract class QueuedHTMLEventInputSource extends HTMLEventInputSource {
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this.poll();
    }
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
}
