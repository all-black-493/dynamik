"use client"

import { javascript } from "@codemirror/lang-javascript"
import { python } from "@codemirror/lang-python"
import { StreamLanguage } from "@codemirror/language"
// R has no dedicated CodeMirror 6 package; the legacy mode is the official route.
import { r as rMode } from "@codemirror/legacy-modes/mode/r"
import CodeMirror from "@uiw/react-codemirror"
import { CheckIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useState } from "react"
import {
    type CodeLanguage,
    EDITOR_LANGUAGE
} from "@/features/executions/lib/code-languages"

const EXTENSIONS = {
    javascript: () => javascript(),
    python: () => python(),
    r: () => StreamLanguage.define(rMode)
}

/**
 * Reports whether the code would parse, without running it.
 *
 * Only JavaScript and TypeScript can be checked in the browser: the Function
 * constructor compiles its argument and throws on a syntax error but never
 * executes the body. Python and R are parsed by their own engines on the
 * server, so a mistake there surfaces when the node runs rather than here.
 */
const findSyntaxError = (code: string, language: CodeLanguage): string | null => {
    if (!code.trim()) return null
    if (language !== "javascript" && language !== "typescript") return null

    try {
        new Function("input", code)
        return null
    } catch (error) {
        return (error as Error).message
    }
}

export const CodeEditor = ({
    value,
    language,
    onChange
}: {
    value: string
    language: CodeLanguage
    onChange: (value: string) => void
}) => {
    const [syntaxError, setSyntaxError] = useState<string | null>(null)

    useEffect(() => {
        // Delayed so the message does not flicker while typing through a
        // half-written statement.
        const timer = setTimeout(() => setSyntaxError(findSyntaxError(value, language)), 400)
        return () => clearTimeout(timer)
    }, [value, language])

    const checkable = language === "javascript" || language === "typescript"

    return (
        <div className="space-y-2">
            <div className="overflow-hidden rounded-md border">
                <CodeMirror
                    value={value}
                    onChange={onChange}
                    extensions={[EXTENSIONS[EDITOR_LANGUAGE[language]]()]}
                    // Always dark. An editor is read as a terminal, and following
                    // the app theme would make it the only light code surface in
                    // an otherwise dark workflow canvas.
                    theme="dark"
                    height="280px"
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
            ) : checkable && value.trim() ? (
                <p className="flex items-center gap-2 text-muted-foreground text-xs">
                    <CheckIcon className="size-3.5 shrink-0" />
                    Parses cleanly
                </p>
            ) : null}
        </div>
    )
}
