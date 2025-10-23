import AppHeader from '@/components/app-header'
import React from 'react'

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <>
            <main className='flex-1'>
                <AppHeader />
                {children}
            </main>
        </>
    )
}

export default Layout
