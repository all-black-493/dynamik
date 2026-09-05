/** Raised when user code cannot be compiled, run, or its result carried back. */
export class SandboxError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "SandboxError"
    }
}
