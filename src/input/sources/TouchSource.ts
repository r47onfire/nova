import { Vec2, Vec2_sub } from "@r47onfire/game-math";
import { Renderer } from "../../rendering/Renderer";
import { Input } from "../types/bindingTypes";
import { TOUCH_DELTA, TOUCH_DOWN, TOUCH_POS } from "../types/Touch";
import { EventList } from "./HTMLEventInputSource";
import { InputType } from "./InputSource";
import { QueuedHTMLEventInputSource } from "./QueuedHTMLEventInputSource";

export interface TouchSourceOptions {
    touchToMouse?: boolean;
}

export class TouchSource extends QueuedHTMLEventInputSource {
    #renderer: Renderer;
    #touchToMouse: boolean;
    constructor(renderer: Renderer, options: TouchSourceOptions) {
        super(renderer.canvas);
        this.#renderer = renderer;
        this.#touchToMouse = options.touchToMouse ?? true;
        this.bind();
    }
    #identifierIndex = new Map<number, number>();
    #identify(identifier: number) {
        if (this.#identifierIndex.has(identifier)) {
            return this.#identifierIndex.get(identifier)!;
        } else {
            const newIndex = this.#identifierIndex.size;
            this.#identifierIndex.set(identifier, newIndex);
            return newIndex;
        }
    }
    #previousPositions = new Map<number, Vec2>();
    #handleTouch(e: TouchEvent, move: boolean, up: boolean) {
        e.preventDefault();
        const { x, y } = this.canvas.getBoundingClientRect();
        const touches = e.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            const { identifier, clientX, clientY } = touches[i]!;
            const index = this.#identify(identifier);
            const pos = this.#renderer.canvasToScreen(new Vec2(clientX - x, clientY - y));
            var delta: Vec2;
            if (move) {
                const prev = this.#previousPositions.get(index)!;
                delta = Vec2_sub(pos, prev);
                this.queue(InputType.DIRECTION, ["touch", "touch/delta" + i as Input, delta]);
            }
            this.#previousPositions.set(index, pos);
            this.queue(InputType.SCALAR, ["touch", "touch/tap" + i as Input, 1]);
            this.queue(InputType.POINTER, ["touch", "touch/pos" + i as Input, pos]);
            if (i === 0 && this.#touchToMouse) {
                this.queue(InputType.SCALAR, ["mouse", "mouse/left", up ? 0 : 1]);
                this.queue(InputType.POINTER, ["mouse", "mouse/pos", pos]);
                if (move) {
                    this.queue(InputType.DIRECTION, ["mouse", "mouse/delta", delta!]);
                }
            }
        }
    }
    canvasEv: EventList<HTMLElementEventMap> = {
        touchstart: e => this.#handleTouch(e, false, false),
        touchmove: e => this.#handleTouch(e, true, false),
        touchend: e => this.#handleTouch(e, false, true),
        touchcancel: e => this.#handleTouch(e, false, true),
    }
    options = {
        [InputType.SCALAR]: TOUCH_DOWN,
        [InputType.DIRECTION]: TOUCH_DELTA,
        [InputType.POINTER]: TOUCH_POS,
    }
}
