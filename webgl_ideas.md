* new library inspired by kaplay
* use WebGL 2 instead (not WebGPU since that can't be monkeyed with the same way that WebGL can)
* objects are classes where possible
* no globals

* Game
    * LoopController (for fixed updates and stuff)
        * SystemController
            * physics system uses @box2d/core
                * possibly re-implementation of it to avoid duplicating linear algebra libs?
    * Renderer
        * defaultVertexFormat
        * draw(Mesh)
        * TextureManager
            * includes packing algorithm that stores list but DOESN'T pack until it's done loading a batch of items
            * handles text rasterization
            * handles encoding aux texture info as pixels next to the sprites
                * normal map offsets
                * specular map offsets
                * emissive map offsets
                * bone matrix list
        * handles batching and buffer management
    * AssetManager
        * no buckets
        * Asset
            * type
        * getAsset(type, name) throws if it's the wrong type
        * AssetLoaders
            * autodetect the type of loading to determine decoder
            * can add hints to make it load in different textures for things like normal/specular/height maps
    * RootObject
        * GameObj class similar to Kaplay's
            * base hooks:
                * #drawTree() looks at components that set isMasked
                * everything is using drawMesh internally
                    * the Mesh doesn't reference any GL internals.
                    * the vertex format and vertices are stored as plain objects
                    * the texture and shader are referenced by name
                    * the uniforms are stored with metadata to allow numbers to be int, bool, or float/vec/mat uniforms
                    * Mesh subclasses for primitives?
                * #updateTransform() gets passed the parent matrix
                * tick() gets passed the dt
            * components work the same way
                * component hooks provide geometry() for physics and debug
            * TextComponent can be subclassed to allow its layout functions to be replaced with e.g. Pretext
    * SceneManager
    * InputManager
        * handles mouse, keyboard, gamepad, and touch input
        * maps button bindings
        * can push and pop contexts with scenes and stuff?
    * SoundManager
        * separate gain node ports for sfx and music
