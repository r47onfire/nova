import { Color } from "@r47onfire/game-math";
import { BlendMode, Uniforms } from "./Shader";
import { Vertex, VertexFormat } from "./vertex";

export class Mesh {
    constructor(
        public format: VertexFormat,
        public vertices: Vertex[],
        public indices: number[],
        public tex: string | null,
        public color: Color,
        public opacity: number,
        public shader: string | null,
        public uniforms: Uniforms,
        public blend: BlendMode,
        public fixed: boolean,
    ) {
    }
}
