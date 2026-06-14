import { V2_ZERO, Vec2, Vec2_set } from "@r47onfire/game-math";
import { isString } from "lib0/function";
import { Input, InputID, VirtualDirectionalInput } from "./types/bindingTypes";

export class DirectionalInputMerger<TButton extends InputID, TStick extends InputID, TPointer extends InputID> {
    #vdiStates = new Map<TStick, Required<VirtualDirectionalInput<number>>>();
    #vdiMap = new Map<TButton, [TStick, keyof VirtualDirectionalInput<any>]>();
    #posBindings = new Map<Input, TPointer>();
    #dirBindings = new Map<Input, TStick>();
    #curDirBindings = new Map<TStick, (Input | VirtualDirectionalInput<TButton>)[]>();
    #curPosBindings = new Map<TPointer, Input[]>();
    bindDir(stick: TStick, bindings: (Input | VirtualDirectionalInput<TButton>)[]) {
        this.deltas.set(stick, new Vec2);
        const oldBindings = this.#curDirBindings.get(stick);
        if (oldBindings) {
            for (var binding of oldBindings) {
                if (isString(binding)) {
                    this.#dirBindings.delete(binding);
                } else {
                    this.#vdiStates.delete(stick);
                    if (binding.up) this.#vdiMap.delete(binding.up);
                    if (binding.down) this.#vdiMap.delete(binding.down);
                    if (binding.left) this.#vdiMap.delete(binding.left);
                    if (binding.right) this.#vdiMap.delete(binding.right);
                }
            }
        }
        this.#curDirBindings.set(stick, bindings);
        for (var binding of bindings) {
            if (isString(binding)) {
                this.#dirBindings.set(binding, stick);
            } else {
                this.#vdiStates.set(stick, { up: 0, down: 0, left: 0, right: 0 });
                if (binding.up) this.#vdiMap.set(binding.up, [stick, "up"]);
                if (binding.down) this.#vdiMap.set(binding.down, [stick, "down"]);
                if (binding.left) this.#vdiMap.set(binding.left, [stick, "left"]);
                if (binding.right) this.#vdiMap.set(binding.right, [stick, "right"]);
            }
        }
    }
    bindPos(pointer: TPointer, bindings: Input[]) {
        this.positions.set(pointer, new Vec2);
        const oldBindings = this.#curPosBindings.get(pointer);
        if (oldBindings) {
            for (var binding of oldBindings) {
                this.#posBindings.delete(binding);
            }
        }
        this.#curPosBindings.set(pointer, bindings);
        for (var binding of bindings) {
            this.#posBindings.set(binding, pointer);
        }
    }
    sendBtn(button: TButton, value: number) {
        const target = this.#vdiMap.get(button);
        if (target) {
            const { 0: stick, 1: dir } = target;
            const state = this.#vdiStates.get(stick)!;
            state[dir] = value;
            Vec2_set(
                this.deltas.get(stick)!,
                state.right - state.left,
                state.up - state.down
            );
        }
    }
    sendDir(input: Input, value: Vec2) {
        const btn = this.#dirBindings.get(input);
        if (btn) {
            this.deltas.set(btn, value);
        }
    }
    sendPtr(input: Input, value: Vec2) {
        const btn = this.#posBindings.get(input);
        if (btn) {
            this.positions.set(btn, value);
            this.moved.set(btn, value);
        }
    }
    moved = new Map<TPointer, Vec2>();
    deltas = new Map<TStick, Readonly<Vec2>>();
    positions = new Map<TPointer, Readonly<Vec2>>();
    reset() {
        const { moved, deltas } = this;
        // Empty the moved list of everything that moved
        moved.clear();
        // Zero the delta values, but don't delete them
        deltas.forEach((_, key) => deltas.set(key, V2_ZERO));
    }
}
