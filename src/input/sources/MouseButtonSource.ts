import { Renderer } from "../../rendering/Renderer";
import { MOUSE_BUTTONS } from "../types/Mouse";
import { EventList } from "./HTMLEventInputSource";
import { InputType } from "./InputSource";
import { QueuedHTMLEventInputSource } from "./QueuedHTMLEventInputSource";

export class MouseButtonSource extends QueuedHTMLEventInputSource {
    constructor(renderer: Renderer) {
        super(renderer.canvas);
        this.bind();
    }
    canvasEv: EventList<HTMLElementEventMap> = {
        mousedown: e => {
            const m = MOUSE_BUTTONS[e.button];
            if (m) this.queue(InputType.SCALAR, ["mouse", m, 1]);
        },
        mouseup: e => {
            const m = MOUSE_BUTTONS[e.button];
            if (m) this.queue(InputType.SCALAR, ["mouse", m, 0]);
        },
        contextmenu: e => e.preventDefault(),
    }
    options = {
        [InputType.SCALAR]: MOUSE_BUTTONS,
        [InputType.DIRECTION]: [],
        [InputType.POINTER]: [],
    }
}
