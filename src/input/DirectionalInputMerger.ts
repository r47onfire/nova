import { Vec2, Vec2_set } from "@r47onfire/game-math";
import { isString } from "lib0/function";
import { Input, InputID, VirtualDirectionalInput } from "./types/bindingTypes";

export class DirectionalInputMerger<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    #vdiStates: Partial<Record<TStick, Required<VirtualDirectionalInput<number>>>> = {};
    #vdiMap: Partial<Record<TButton, [TStick, keyof VirtualDirectionalInput<any>]>> = {};
    #posBindings = new Map<Input, TPointer>();
    #dirBindings = new Map<Input, TStick>();
    #curDirBindings = new Map<TStick, (Input | VirtualDirectionalInput<TButton>)[]>();
    #curPosBindings = new Map<TPointer, Input[]>();
    bindDir(button: TStick, bindings: (Input | VirtualDirectionalInput<TButton>)[]) {
        this.values[0][button] = new Vec2();
        const oldBindings = this.#curDirBindings.get(button);
        if (oldBindings) {
            for (var binding of oldBindings) {
                if (isString(binding)) {
                    this.#dirBindings.delete(binding);
                } else {
                    delete this.#vdiStates[button];
                    if (binding.up) delete this.#vdiMap[binding.up];
                    if (binding.down) delete this.#vdiMap[binding.down];
                    if (binding.left) delete this.#vdiMap[binding.left];
                    if (binding.right) delete this.#vdiMap[binding.right];
                }
            }
        }
        this.#curDirBindings.set(button, bindings);
        for (var binding of bindings) {
            if (isString(binding)) {
                this.#dirBindings.set(binding, button);
            } else {
                this.#vdiStates[button] = { up: 0, down: 0, left: 0, right: 0 };
                if (binding.up) this.#vdiMap[binding.up] = [button, "up"];
                if (binding.down) this.#vdiMap[binding.down] = [button, "down"];
                if (binding.left) this.#vdiMap[binding.left] = [button, "left"];
                if (binding.right) this.#vdiMap[binding.right] = [button, "right"];
            }
        }
    }
    bindPos(button: TPointer, bindings: Input[]) {
        this.values[1][button] = new Vec2();
        const oldBindings = this.#curPosBindings.get(button);
        if (oldBindings) {
            for (var binding of oldBindings) {
                this.#posBindings.delete(binding);
            }
        }
        this.#curPosBindings.set(button, bindings);
        for (var binding of bindings) {
            this.#posBindings.set(binding, button);
        }
    }
    sendBtn(button: TButton, value: number) {
        const target = this.#vdiMap[button];
        if (target) {
            const { 0: stick, 1: dir } = target;
            const state = this.#vdiStates[stick]!;
            state[dir] = value;
            Vec2_set(
                this.values[0][stick] ??= new Vec2(),
                state.right - state.left,
                state.up - state.down
            );
        }
    }
    sendDir(input: Input, value: Vec2) {
        const btn = this.#dirBindings.get(input);
        if (btn) {
            this.values[0][btn] = value;
        }
    }
    sendPtr(input: Input, value: Vec2) {
        const btn = this.#posBindings.get(input);
        if (btn) {
            this.values[1][btn] = this.moved[btn] = value;
        }
    }
    moved!: Partial<Record<TPointer, Vec2>>;
    values: [directional: Partial<Record<TStick, Readonly<Vec2>>>, positional: Partial<Record<TPointer, Readonly<Vec2>>>] = [{}, {}];
    reset() {
        this.moved = {};
    }
    constructor() {
        this.reset();
    }
}
