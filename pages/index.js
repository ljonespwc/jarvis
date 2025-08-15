import dynamic from 'next/dynamic';

// Dynamically import to avoid SSR issues with Layercode SDK
const UnifiedInterface = dynamic(() => import('../components/UnifiedInterface'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      fontFamily: 'system-ui',
      color: '#666'
    }}>
      Initializing JARVIS...
    </div>
  )
});

export default function Home() {
  return <UnifiedInterface />
}