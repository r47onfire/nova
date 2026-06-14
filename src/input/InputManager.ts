import { V2_ZERO, Vec2 } from "@r47onfire/game-math";
import { keys } from "lib0/object";
import Nova from "..";
import { Renderer } from "../rendering/Renderer";
import { ButtonDetector } from "./ButtonDetector";
import { DirectionalInputMerger } from "./DirectionalInputMerger";
import { InputSource, InputType } from "./sources/InputSource";
import { KeyboardSource } from "./sources/KeyboardSource";
import { MouseButtonSource } from "./sources/MouseButtonSource";
import { MouseMoveSource } from "./sources/MouseMoveSource";
import { ScrollSource } from "./sources/ScrollSource";
import { TouchSource, TouchSourceOptions } from "./sources/TouchSource";
import { ButtonCombo, Input, InputID, InputSourceSemanticType, VirtualDirectionalInput } from "./types/bindingTypes";

export interface InputManagerOptions<TButton extends InputID, TStick extends InputID, TPointer extends InputID> extends TouchSourceOptions {
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
    // TODO: gamepadconnect and gamepaddisconnect events
};

/**
 * Handles getting input from all sources and firing input events
 *
 * (e.g. key events, mouse events, gamepad events)
 */
export class InputManager<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    #buttons = new ButtonDetector<TButton>;
    #directional = new DirectionalInputMerger<TButton, TStick, TPointer>;
    #game: Nova;
    /**
     * key is keyboard, mouse, gamepad, touch, etc
     */
    #sources: InputSource[];
    lastInputSrc: InputSourceSemanticType | undefined;
    constructor(
        game: Nova<any, any, any>,
        options: InputManagerOptions<TButton, TStick, TPointer>,
        renderer: Renderer,
    ) {
        this.#game = game;
        var i: number;
        const { buttons, sticks, pointers } = options;
        if (buttons) {
            const buttonNames = keys(this.#buttonBindings = buttons) as TButton[];
            for (i = 0; i < buttonNames.length; i++) {
                this.bindBtn(buttonNames[i]!, buttons[buttonNames[i]!]);
            }
        }
        if (sticks) {
            const stickNames = keys(this.#dirBindings = sticks) as TStick[];
            for (i = 0; i < stickNames.length; i++) {
                this.bindDir(stickNames[i]!, sticks[stickNames[i]!]);
            }
        }
        if (pointers) {
            const pointerNames = keys(this.#posBindings = pointers) as TPointer[];
            for (i = 0; i < pointerNames.length; i++) {
                this.bindPos(pointerNames[i]!, pointers[pointerNames[i]!]);
            }
        }
        this.#sources = [
            new MouseMoveSource(renderer),
            new MouseButtonSource(renderer),
            new ScrollSource(renderer),
            new KeyboardSource(renderer),
            new TouchSource(renderer, options),
        ];
    }
    #buttonBindings: Partial<Record<TButton, ButtonCombo[]>> = {};
    bindBtn(button: TButton, binding: ButtonCombo[]) {
        this.#buttons.bind(button, binding);
        this.#buttonBindings[button] = binding;
    }
    getBtnBinding(button: TButton) {
        return this.#buttonBindings[button];
    }
    getBtnValue(button: TButton) {
        return this.#buttons.values.get(button) ?? 0;
    }
    #dirBindings: Partial<Record<TStick, (Input | VirtualDirectionalInput<TButton>)[]>> = {};
    bindDir(stick: TStick, binding: (Input | VirtualDirectionalInput<TButton>)[]) {
        this.#directional.bindDir(stick, binding);
        this.#dirBindings[stick] = binding;
    }
    getDirBinding(stick: TStick) {
        return this.#dirBindings[stick];
    }
    getDirValue(stick: TStick) {
        return this.#directional.deltas.get(stick) ?? V2_ZERO;
    }
    #posBindings: Partial<Record<TPointer, Input[]>> = {};
    bindPos(pointer: TPointer, binding: Input[]) {
        this.#directional.bindPos(pointer, binding);
        this.#posBindings[pointer] = binding;
    }
    getPosBinding(pointer: TPointer) {
        return this.#posBindings[pointer];
    }
    getPosValue(pointer: TPointer) {
        return this.#directional.positions.get(pointer) ?? V2_ZERO;
    }
    update() {
        this.#buttons.reset();
        this.#directional.reset();
        // Feed all the accumulated inputs
        var i: number, j: number;
        const sources = this.#sources;
        for (i = 0; i < sources.length; i++) {
            const source = sources[i]!;
            const {
                [InputType.SCALAR]: buttonEvents,
                [InputType.DIRECTION]: directionalEvents,
                [InputType.POINTER]: pointerEvents,
            } = source.poll();
            for (j = 0; j < buttonEvents.length; j++) {
                const { 0: type, 1: key, 2: value, 3: text } = buttonEvents[j]!;
                this.lastInputSrc = type;
                this.#buttons.send(key, value);
                if (text) this.#game.emit("inputkey", text);
            }
            for (j = 0; j < directionalEvents.length; j++) {
                const { 0: type, 1: key, 2: value } = directionalEvents[j]!;
                this.lastInputSrc = type;
                this.#directional.sendDir(key, value);
            }
            for (j = 0; j < pointerEvents.length; j++) {
                const { 0: type, 1: key, 2: value } = pointerEvents[j]!;
                this.lastInputSrc = type;
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
        down.forEach((value, name) => {
            if (value > 0) this.#game.emit("buttonheld", [name, value]);
        });
        // Handle directional
        this.#buttons.values.forEach((value, name) => {
            this.#directional.sendBtn(name, value);
        });
        this.#directional.deltas.forEach((value, name) => {
            this.#game.emit("inputdelta", [name, value]);
        });
        this.#directional.moved.forEach((value, name) => {
            this.#game.emit("inputpoint", [name, value]);
        });
    }
    destroy() {
        while (this.#sources.length) this.#sources.pop()!.destroy();
    }
}
