import { Header } from '@/components/Header'
import { LiveTranscript } from '@/components/LiveTranscript'
import { Recorder } from '@/components/Recorder'
import { useTranscriber } from '@/hooks/useTranscriber'

function App() {
  const { status, interim, segments, error, start, stop } = useTranscriber()

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:py-8">
        <Recorder status={status} error={error} onStart={() => void start()} onStop={stop} />
        <LiveTranscript segments={segments} interim={interim} status={status} />
      </main>
    </div>
  )
}

export default App
