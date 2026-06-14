import { Renderer } from "../../rendering/Renderer";
import { Key, KEYS } from "../types/Keys";
import { EventList } from "./HTMLEventInputSource";
import { InputType } from "./InputSource";
import { QueuedHTMLEventInputSource } from "./QueuedHTMLEventInputSource";

const PREVENT_DEFAULT_KEYS = new Set([
    " ",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Tab",
]);

// translate these key names to a simpler version
const KEY_ALIAS: Record<string, string> = {
    "ArrowLeft": "left",
    "ArrowRight": "right",
    "ArrowUp": "up",
    "ArrowDown": "down",
    " ": "space",
};

export class KeyboardSource extends QueuedHTMLEventInputSource {
    constructor(renderer: Renderer) {
        super(renderer.canvas);
        this.bind();
    }
    canvasEv: EventList<HTMLElementEventMap> = {
        keydown: e => {
            // state.capsOn = e.getModifierState("CapsLock");

            if (PREVENT_DEFAULT_KEYS.has(e.key)) {
                e.preventDefault();
            }
            if (e.repeat) {
                return;
                // state.keyState.pressRepeat(k, state);
            }
            const { 0: k, 1: text } = convertToKey(e.key);
            this.queue(InputType.SCALAR, ["keyboard", k as Key, 1, text]);
        },
        keyup: e => {
            const { 0: k } = convertToKey(e.key);
            this.queue(InputType.SCALAR, ["keyboard", k, 0]);
        }
    }
    options = {
        [InputType.SCALAR]: KEYS,
        [InputType.DIRECTION]: [],
        [InputType.POINTER]: [],
    }
}

const convertToKey = (keyText: string) => {
    var k = KEY_ALIAS[keyText] || keyText.toLowerCase();
    var text = undefined;
    if (keyText.length === 1) {
        text = keyText;
    }
    k = "key/" + k;
    return [k as Key, text] as const;
};
