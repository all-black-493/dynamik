"use client"

import { javascript } from "@codemirror/lang-javascript"
import CodeMirror from "@uiw/react-codemirror"
import { CheckIcon, TriangleAlertIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

/**
 * Reports whether the code would parse, without running it.
 *
 * The Function constructor compiles its argument and throws on a syntax error,
 * but does not execute the body, so this is a parse check rather than an eval.
 * It is the same check the sandbox will apply server-side, surfaced early
 * enough to fix a typo before a run rather than after one.
 */
const findSyntaxError = (code: string): string | null => {
    if (!code.trim()) return null

    try {
        // The body is wrapped the same way the sandbox wraps it, so a bare
        // `return` at the top level parses here exactly as it will there.
        new Function("input", code)
        return null
    } catch (error) {
        return (error as Error).message
    }
}

export const CodeEditor = ({
    value,
    onChange
}: {
    value: string
    onChange: (value: string) => void
}) => {
    const { resolvedTheme } = useTheme()
    const [syntaxError, setSyntaxError] = useState<string | null>(null)

    useEffect(() => {
        // Checked on a short delay so the message does not flicker while typing
        // through a half-written statement.
        const timer = setTimeout(() => setSyntaxError(findSyntaxError(value)), 400)
        return () => clearTimeout(timer)
    }, [value])

    return (
        <div className="space-y-2">
            <div className="overflow-hidden rounded-md border">
                <CodeMirror
                    value={value}
                    onChange={onChange}
                    extensions={[javascript()]}
                    theme={resolvedTheme === "dark" ? "dark" : "light"}
                    height="260px"
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        highlightActiveLine: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        highlightSelectionMatches: false
                    }}
                />
            </div>

            {syntaxError ? (
                <p className="flex items-start gap-2 text-destructive text-xs">
                    <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
                    <span className="font-mono">{syntaxError}</span>
                </p>
            ) : value.trim() ? (
                <p className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CheckIcon className="size-3.5 shrink-0" />
                    Parses cleanly
                </p>
            ) : null}
        </div>
    )
}
