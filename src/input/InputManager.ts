import { Vec2 } from "@r47onfire/game-math";
import { keys } from "lib0/object";
import Nova from "..";
import { Renderer } from "../rendering/Renderer";
import { ButtonDetector } from "./ButtonDetector";
import { DirectionalInputMerger } from "./DirectionalInputMerger";
import { ButtonCombo, Input, InputID, InputSourceSemanticType, VirtualDirectionalInput } from "./types/bindingTypes";
import { InputSource, InputType } from "./types/InputSource";

export interface InputManagerOptions<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    buttons?: Record<TButton, ButtonCombo[]>;
    sticks?: Record<TStick, (Input | VirtualDirectionalInput<TButton>)[]>;
    pointers?: Record<TPointer, Input[]>;
}

export interface InputEvents<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    /** Runs once when the button is pressed */
    buttondown: [TButton, void];
    /** Runs once when the button is released */
    buttonup: [TButton, void];
    /** Runs every frame while the button is pressed, called with the analog value, which will be strictly > 0 */
    buttonheld: [TButton, number];
    /** Runs every frame, with the clamped input motion vector */
    inputdelta: [TStick, Vec2];
    /** Runs every frame that the pointer moved, with the screen-space pointed to position */
    inputpoint: [TPointer, Vec2];
    /** Runs when a text input key is pressed */
    inputkey: string;
};

/**
 * Handles getting input from all sources and firing input events
 *
 * (e.g. key events, mouse events, gamepad events)
 */
export class InputManager<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    #buttons = new ButtonDetector<TButton>;
    #directional = new DirectionalInputMerger<TButton, TStick, TPointer>;
    #game: Nova<TButton, TStick, TPointer>;
    /**
     * key is keyboard, mouse, gamepad, touch, etc
     */
    sources: InputSource[] = [];
    lastInputSrc: InputSourceSemanticType | undefined;
    constructor(
        game: Nova<TButton, TStick, TPointer>,
        options: InputManagerOptions<TButton, TStick, TPointer>,
        renderer: Renderer,
    ) {
        this.#game = game;
        var i;
        const { buttons, sticks, pointers } = options;
        if (buttons) {
            const buttonNames = keys(buttons) as TButton[];
            for (i = 0; i < buttonNames.length; i++) {
                this.#buttons.bind(buttonNames[i]!, buttons[buttonNames[i]!]);
            }
        }
        if (sticks) {
            const stickNames = keys(sticks) as TStick[];
            for (i = 0; i < stickNames.length; i++) {
                this.#directional.bindDir(stickNames[i]!, sticks[stickNames[i]!]);
            }
        }
        if (pointers) {
            const pointerNames = keys(pointers) as TPointer[];
            for (i = 0; i < pointerNames.length; i++) {
                this.#directional.bindPos(pointerNames[i]!, pointers[pointerNames[i]!]);
            }
        }
    }
    update() {
        this.#buttons.reset();
        this.#directional.reset();
        // Feed all the accumulated inputs
        var i, j;
        const e = this.sources;
        for (i = 0; i < e.length; i++) {
            const source = this.sources[i]!;
            const {
                [InputType.SCALAR]: buttonEvents,
                [InputType.DIRECTION]: directionalEvents,
                [InputType.POINTER]: pointerEvents,
            } = source.poll();
            for (j = 0; j < buttonEvents.length; j++) {
                this.lastInputSrc = source.semType
                const { 0: key, 1: value, 2: text } = buttonEvents[j]!;
                this.#buttons.send(key, value);
                if (text) this.#game.emit("inputkey", text);
            }
            for (j = 0; j < directionalEvents.length; j++) {
                this.lastInputSrc = source.semType
                const { 0: key, 1: value } = directionalEvents[j]!;
                this.#directional.sendDir(key, value);
            }
            for (j = 0; j < pointerEvents.length; j++) {
                this.lastInputSrc = source.semType
                const { 0: key, 1: value } = pointerEvents[j]!;
                this.#directional.sendPtr(key, value);
            }
        }
        // Handle buttons
        const { 0: pressed, 1: released, 2: down } = this.#buttons.result;
        for (i = 0; i < pressed.length; i++) {
            this.#game.emit("buttondown", [pressed[i]!, ,]);
        }
        for (i = 0; i < released.length; i++) {
            this.#game.emit("buttonup", [released[i]!, ,]);
        }
        const vk = keys(down) as TButton[];
        for (i = 0; i < vk.length; i++) {
            const name = vk[i]!;
            const value = down[name]!;
            if (value > 0) this.#game.emit("buttonheld", [name, value]);
        }
        // Handle directional
        const bv = this.#buttons.values, bk = keys(bv) as TButton[];
        for (i = 0; i < bk.length; i++) {
            this.#directional.sendBtn(bk[i]!, bv[bk[i]!]!);
        }
        const { 0: dv } = this.#directional.values, dk = keys(dv) as TStick[];
        for (i = 0; i < dk.length; i++) {
            this.#game.emit("inputdelta", [dk[i]!, dv[dk[i]!]!]);
        }
        const pv = this.#directional.moved, pk = keys(pv) as TPointer[];
        for (i = 0; i < pk.length; i++) {
            this.#game.emit("inputpoint", [pk[i]!, pv[pk[i]!]!]);
        }
    }
    destroy() {
        while (this.sources.length) this.sources.pop()!.destroy();
    }
}
