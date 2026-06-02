import { StringMatrix } from "../utils/types";
import { RenderModifiers } from "./RenderModifiers";
import { Vertex, VertexFormat } from "./vertex";

export class Mesh<F extends StringMatrix> {
    constructor(
        public format: VertexFormat<F>,
        public vertices: Vertex<F>[],
        public indices: number[],
        public mod: RenderModifiers = {},
    ) { }
}
