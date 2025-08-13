import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the voice components to avoid SSR issues
const VoiceInterfaceClient = dynamic(() => import('./VoiceInterfaceClient'), {
  ssr: false,
  loading: () => <div className="status">Initializing JARVIS...</div>
})

export default function VoiceInterface() {
  return <VoiceInterfaceClient />
}