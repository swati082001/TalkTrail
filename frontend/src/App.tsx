import { Header } from '@/components/Header'
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Button>Start recording</Button>
      </main>
    </div>
  )
}

export default App
