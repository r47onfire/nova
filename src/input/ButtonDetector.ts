import { isString } from "lib0/function.js";
import { ButtonCombo, Input, InputID } from "./types/bindingTypes";

export class ButtonDetector<TButton extends InputID> {
    constructor() {
        this.reset();
    }
    // map of mod key --> down state
    #mods = new Map<Input, boolean>();
    // map of commit key --> checkers for this commit key
    #committers = new Map<Input, [toCheck: Set<Input>, buttonsMap: Map<TButton, Input[]>]>();
    #buttonsUsed = new Set<TButton>();
    bind(button: TButton, bindings: ButtonCombo[]) {
        // clear out old binding
        const modsToClear = new Set<Input>();
        for (var { 0: check, 1: btns } of this.#committers.values()) {
            btns.get(button)?.forEach(b =>
                check.delete(b) && modsToClear.add(b)
            );
            btns.delete(button);
        }
        // install new one
        for (var b of bindings) {
            const mods = isString(b) ? [b] : b as Input[];
            const committer = mods.pop()!;
            // add checking on the old mod keys
            for (var m of mods) {
                modsToClear.delete(m);
                if (!this.#mods.has(m)) this.#mods.set(m, false);
            }

            // install new buttons
            if (!this.#committers.has(committer)) {
                this.#committers.set(committer, [
                    new Set(mods),
                    new Map([[button, mods]]),
                ]);
            }
            else {
                const e = this.#committers.get(committer)!;
                mods.forEach(m => e[0].add(m));
                e[1].set(button, mods);
            }
        }
        // cleanup
        modsToClear.forEach(m => this.#mods.delete(m));
        console.log({ committers: this.#committers, mods: this.#mods });
    }
    /**
     * Returns the names of the buttons that were triggered by this input being pressed.
     */
    #press(input: Input): TButton[] {
        if (this.#mods.has(input)) {
            this.#mods.set(input, true);
        }
        const commit = this.#committers.get(input);
        const pressedButtons: TButton[] = [];
        if (commit) {
            const { 0: toCheck, 1: buttonsMap } = commit;
            options: for (var { 0: button, 1: mods } of buttonsMap.entries()) {
                for (var mod of toCheck.values()) {
                    if (this.#mods.get(mod) !== mods.includes(mod)) {
                        continue options;
                    }
                }
                this.#buttonsUsed.add(button);
                pressedButtons.push(button);
            }
        }
        return pressedButtons;
    }
    /**
     * Returns the names of the buttons that were un-triggered by this input being released.
     */
    #release(input: Input): TButton[] {
        if (this.#mods.has(input)) {
            this.#mods.set(input, false);
        }
        const commit = this.#committers.get(input);
        const canceledButtons: TButton[] = [];
        if (commit) {
            for (var button of commit[1].keys()) {
                this.#buttonsUsed.delete(button) && canceledButtons.push(button);
            }
        }
        return canceledButtons;
    }
    #currentValues = new Map<Input, number>();
    #trackingValues = new Map<Input, Set<TButton>>();
    values = new Map<TButton, number>();
    result: [pressed: TButton[], released: TButton[], down: Map<TButton, number>] = [[], [], new Map];
    send(input: Input, value: number) {
        const oldValue = this.#currentValues.get(input) ?? 0;
        this.#currentValues.set(input, value);
        const { values, result: { 0: pressed, 1: released, 2: down } } = this;
        if (value > 0 && oldValue <= 0) {
            const werePressed = this.#press(input);
            for (var item of werePressed) {
                this.#trackingValues.getOrInsertComputed(input, () => new Set()).add(item);
                pressed.push(item);
            }
        } else if (value <= 0 && oldValue > 0) {
            const wereReleased = this.#release(input);
            for (var item of wereReleased) {
                this.#trackingValues.get(input)?.delete(item);
                down.set(item, value);
                values.set(item, value);
                released.push(item);
            }
        }
        this.#trackingValues.get(input)?.forEach(b => {
            down.set(b, value);
            values.set(b, value);
        });
    }
    reset() {
        const { 0: pressed, 1: released, 2: down } = this.result;
        pressed.length = released.length = 0;
        down.clear();
    }
}
