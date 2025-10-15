import React from 'react'
import { TRPCReactProvider } from '@/trpc/client'

const Providers = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    return (
        <div>
            <TRPCReactProvider>
                {children}
            </TRPCReactProvider>
        </div>
    )
}


export default Providers
