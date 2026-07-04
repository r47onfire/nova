import { keys } from "lib0/object";
import Nova from "../../..";
import { GAMEPAD_ABS, GAMEPAD_BUTTONS, GAMEPAD_STICKS, GamepadButton, GamepadStick } from "../../types/Gamepad";
import { EventList, HTMLEventInputSource } from "../HTMLEventInputSource";
import { InputEventEntry, InputType } from "../InputSource";
import { WrappedGamepad } from "./WrappedGamepad";

type Strip<P extends string, S extends string> = S extends `${P}${infer U}:${number}` ? U : S extends `${P}${infer U}` ? U : never;

export enum GamepadType {
    UNKNOWN,
    PS4,
    PS5,
    XBOX,
    NINTENDO,
    STEAM,
}

export type GamepadMapping = {
    vidPid: [vid: number, pids?: number[]];
    names: string[];
    name: string;
    type: GamepadType;
    buttons: Record<number, Strip<"gamepad/", GamepadButton>>;
    sticks: Partial<Record<Strip<"gamepad/", GamepadStick>, { x: number; y: number }>>;
};

export interface GamepadOptions {
    gamepadDeadzone?: number;
    gamepadMappings?: GamepadMapping[];
}

export class GamepadSource extends HTMLEventInputSource {
    #gamepads: Record<number, WrappedGamepad> = {};
    #game: Nova;
    #options: GamepadOptions;
    constructor(game: Nova<any, any, any>, options: GamepadOptions) {
        super(null as any);
        this.#game = game;
        this.#options = options;
        this.bind();
    }
    poll(): { [T in InputType]: InputEventEntry<T>[]; } {
        const out: { [T in InputType]: InputEventEntry<T>[] } = {
            [InputType.SCALAR]: [],
            [InputType.DIRECTION]: [],
            [InputType.POINTER]: []
        };
        const allGamepads = navigator.getGamepads();
        var i;
        for (i = 0; i < allGamepads.length; i++) {
            if (allGamepads[i] && !this.#gamepads[i]) {
                this.#connectGamepad(allGamepads[i]!);
            } else if (!allGamepads[i] && this.#gamepads[i]) {
                this.#disconnectGamepad(this.#gamepads[i]!.gamepad);
            }
        }
        const activeIndices = keys(this.#gamepads) as any as number[];
        for (i = 0; i < activeIndices.length; i++) {
            const index = activeIndices[i]!;
            const {
                [InputType.SCALAR]: buttonEvents,
                [InputType.DIRECTION]: directionalEvents,
                [InputType.POINTER]: pointerEvents,
            } = this.#gamepads[index]!.poll();
            pushAllWithAndWithoutIndex(index, out[InputType.SCALAR], buttonEvents);
            pushAllWithAndWithoutIndex(index, out[InputType.DIRECTION], directionalEvents);
            pushAllWithAndWithoutIndex(index, out[InputType.POINTER], pointerEvents);
        }
        return out;
    }
    #connectGamepad(gamepad: Gamepad) {
        this.#gamepads[gamepad.index] = new WrappedGamepad(gamepad, this.#options);
        this.#game.emit("gamepadconnected", gamepad.index);
    }
    #disconnectGamepad(gamepad: Gamepad) {
        delete this.#gamepads[gamepad.index];
        this.#game.emit("gamepaddisconnected", gamepad.index);
    }
    winEv: EventList<WindowEventMap> = {
        gamepadconnected: e => {
            this.#connectGamepad(e.gamepad);
        },
        gamepaddisconnected: e => {
            this.#disconnectGamepad(e.gamepad);
        }
    }
    options = {
        [InputType.SCALAR]: GAMEPAD_BUTTONS,
        [InputType.DIRECTION]: GAMEPAD_STICKS,
        [InputType.POINTER]: GAMEPAD_ABS,
    }
}

const pushAllWithAndWithoutIndex = <T extends InputEventEntry<any>>(index: number, target: T[], source: T[]) => {
    for (var i = 0; i < source.length; i++) {
        const entry = source[i]!;
        const { 0: type, 1: name, 2: value, 3: aux } = entry;
        target.push(entry);
        target.push([type, `${name}:${index}`, value, aux] as any);
    }
}
