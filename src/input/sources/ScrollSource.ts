import { Vec2 } from "@r47onfire/game-math";
import { Renderer } from "../../rendering/Renderer";
import { MOUSE_REL_SCROLL } from "../types/Mouse";
import { EventList } from "./HTMLEventInputSource";
import { InputType } from "./InputSource";
import { QueuedHTMLEventInputSource } from "./QueuedHTMLEventInputSource";

export class ScrollSource extends QueuedHTMLEventInputSource {
    constructor(renderer: Renderer) {
        super(renderer.canvas);
        this.bind();
    }
    canvasEv: EventList<HTMLElementEventMap> = {
        wheel: e => {
            e.preventDefault();
            this.queue(InputType.DIRECTION, ["mouse", MOUSE_REL_SCROLL[0], new Vec2(e.deltaX, e.deltaY)]);
        }
    }
    options = {
        [InputType.SCALAR]: [],
        [InputType.DIRECTION]: MOUSE_REL_SCROLL,
        [InputType.POINTER]: [],
    }
}