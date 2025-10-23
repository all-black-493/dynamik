import { requireAuth } from '@/lib/auth-utils'
import React from 'react'

const Page = async () => {
      await requireAuth()
    
    return <p>Credentials</p>
}

export default Page
