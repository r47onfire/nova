import { COLOR_WHITE } from "@r47onfire/game-math";
import { InputManager, InputManagerOptions } from "./input/InputManager";
import { TimeController } from "./loop/TimeController";
import { Mesh } from "./rendering/Mesh";
import { Renderer, RendererOptions } from "./rendering/Renderer";
import { BlendMode } from "./rendering/Shader";
import { DEFAULT_VERTEX_FORMAT } from "./rendering/vertex";
export * from "@r47onfire/game-math";

export interface NovaOptions extends RendererOptions, InputManagerOptions {

}

export default class Nova {
    readonly renderer: Renderer;
    #timeController = new TimeController;
    #inputs: InputManager;
    constructor(options: NovaOptions) {
        this.renderer = new Renderer(options, () => this.#inputs.queue("resize"));
        this.#inputs = new InputManager(options);
        this.#timeController.start(dt => this.#mainloop(dt));
    }
    #mainloop(dt: number) {
        // Update systems
        // Update root object
        // Draw
        this.renderer.draw(() => {
            this.renderer.drawMesh(new Mesh(
                DEFAULT_VERTEX_FORMAT,
                [
                    { x: 100, y: 100, u: -1, v: -1 },
                    { x: 200, y: 100, u: -1, v: -1 },
                    { x: 100, y: 200, u: -1, v: -1 },
                    { x: 200, y: 200, u: -1, v: -1 },
                ],
                [0, 1, 2, 1, 2, 3],
                "null",
                COLOR_WHITE,
                1,
                null,
                {},
                BlendMode.NORMAL,
                false
            ));
        });
    }
}
