import { UniqueTuple } from "../../utils/types";
import { GamepadButton, GamepadStick } from "./Gamepad";
import { Key } from "./Keys";
import { MouseButton, MouseInput } from "./Mouse";

export type InputID = `${string}:${string}`;

export interface VirtualDirectionalInput<TButton> {
    up?: TButton;
    down?: TButton;
    left?: TButton;
    right?: TButton;
}

export interface InputMap {
    keyboard: Key,
    mouse: MouseButton | MouseInput,
    gamepad: GamepadButton | GamepadStick,
}

export type InputSourceSemanticType = keyof InputMap;

export type Input = InputMap[keyof InputMap];

// Typescript can't handle more than 2 in the unique tuple lmao
export type ButtonCombo = Input | UniqueTuple<Input, 2> | [Input, Input, Input, ...Input[]];
