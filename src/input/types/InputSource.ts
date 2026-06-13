import { Vec2 } from "@r47onfire/game-math";
import { Input, InputSourceSemanticType } from "./bindingTypes";

export const enum InputType {
    SCALAR,
    DIRECTION,
    POINTER,
}

export type InputEventEntry<T extends InputType> = [name: Input, value: {
    [InputType.SCALAR]: number,
    [InputType.DIRECTION]: Vec2,
    [InputType.POINTER]: Vec2,
}[T], aux?: string];

export interface InputSource {
    readonly semType: InputSourceSemanticType;
    options(): Record<InputType, Input[]>;
    poll(): { [T in InputType]: InputEventEntry<T>[] };
    destroy(): void;
}
