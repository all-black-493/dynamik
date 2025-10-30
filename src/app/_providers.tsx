import React from 'react'
import { TRPCReactProvider } from '@/trpc/client'
import { Provider } from 'jotai';

const Providers = ({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) => {
    return (
        <div>
            <TRPCReactProvider>
                <Provider>
                    {children}
                </Provider>
            </TRPCReactProvider>
        </div>
    )
}


export default Providers
