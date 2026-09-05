/**
 * The names of a node's default input and output.
 *
 * These live on their own, with no dependencies, because both the canvas and
 * the engine need them. The canvas writes a connection's handle id, and the
 * engine matches that id when deciding which edges to follow, so the two must
 * agree exactly. They did not: handles were labelled "source-1" while the
 * engine looked for "main", and every edge drawn from a default handle was
 * therefore ignored.
 */
export const DEFAULT_OUTPUT = "main"
export const DEFAULT_INPUT = "main"
