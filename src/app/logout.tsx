"use client"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

import React from 'react'
import { useRouter } from "next/navigation"

const LogoutButton = () => {

    const router = useRouter()
    return (
        <Button onClick={() => authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                }
            }
        })}>
            Log Out
        </Button>
    )
}

export default LogoutButton
