import { Vec2 } from "@r47onfire/game-math";
import { Input, InputSourceSemanticType } from "../types/bindingTypes";

export const enum InputType {
    SCALAR,
    DIRECTION,
    POINTER,
}

export type InputEventEntry<T extends InputType> = [
    semanticType: InputSourceSemanticType | undefined,
    name: Input,
    value: {
        [InputType.SCALAR]: number,
        [InputType.DIRECTION]: Vec2,
        [InputType.POINTER]: Vec2,
    }[T],
    aux?: string,
];

export abstract class InputSource {
    abstract readonly options: Readonly<Record<InputType, readonly Input[]>>;
    abstract poll(): { [T in InputType]: InputEventEntry<T>[] };
    abstract destroy(): void;
}
