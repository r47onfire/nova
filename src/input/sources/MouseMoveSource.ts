import { Vec2 } from "@r47onfire/game-math";
import { Renderer } from "../../rendering/Renderer";
import { MOUSE_ABS, MOUSE_REL_MOVE } from "../types/Mouse";
import { EventList } from "./HTMLEventInputSource";
import { InputType } from "./InputSource";
import { QueuedHTMLEventInputSource } from "./QueuedHTMLEventInputSource";

export class MouseMoveSource extends QueuedHTMLEventInputSource {
    #renderer: Renderer;
    constructor(renderer: Renderer) {
        super(renderer.canvas);
        this.#renderer = renderer;
        this.bind();
    }
    canvasEv: EventList<HTMLElementEventMap> = {
        mousemove: ({ offsetX, offsetY, movementX, movementY }) => {
            const mousePos = this.#renderer.canvasToScreen(new Vec2(offsetX, offsetY));
            const mouseDeltaPos = new Vec2(movementX, movementY);
            this.queue(InputType.POINTER, ["mouse", "mouse/pos", mousePos]);
            this.queue(InputType.DIRECTION, ["mouse", "mouse/delta", mouseDeltaPos]);
        }
    }
    options = {
        [InputType.SCALAR]: [],
        [InputType.DIRECTION]: MOUSE_REL_MOVE,
        [InputType.POINTER]: MOUSE_ABS,
    }
}
