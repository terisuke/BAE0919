import { useCallback, useState, useEffect } from 'react'
import { buildUrl } from '@/utils/buildUrl'

import homeStore from '@/features/stores/home'

export default function VrmViewer() {
  const canvasRef = useCallback((canvas: HTMLCanvasElement) => {
    if (canvas) {
      const { viewer } = homeStore.getState()
      viewer.setup(canvas)
      viewer.loadVrm(buildUrl('/AvatarSample_A.vrm'))

      // Drag and DropでVRMを差し替え
      canvas.addEventListener('dragover', function (event) {
        event.preventDefault()
      })

      canvas.addEventListener('drop', function (event) {
        event.preventDefault()

        const files = event.dataTransfer?.files
        if (!files) {
          return
        }

        const file = files[0]
        if (!file) {
          return
        }
        const file_type = file.name.split('.').pop()
        if (file_type === 'vrm') {
          const blob = new Blob([file], { type: 'application/octet-stream' })
          const url = window.URL.createObjectURL(blob)
          viewer.loadVrm(url)
        } else if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.readAsDataURL(file)
          reader.onload = function () {
            const image = reader.result as string
            image !== '' && homeStore.setState({ modalImage: image })
          }
        }
      })
    }
  }, [])

  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo',
    })
  )
  const [date, setDate] = useState(
    new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full' }).format(new Date())
  )
  const [currentTime, setCurrentTime] = useState<string>('')

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Tokyo',
        })
      )
      setDate(
        new Intl.DateTimeFormat('ja-JP', { dateStyle: 'full' }).format(now)
      )
      setCurrentTime(now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={'absolute top-0 left-0 w-screen h-[100svh] z-5'}>
      <div className="absolute top-0 left-0 right-0 text-center p-5">
        <div className="flex flex-col gap-2 text-white text-2xl font-bold">
          <h1 className="text-3xl font-extrabold">{time}</h1>
          <p className="text-lg font-medium text-sky-1">{date}</p>
        </div>
      </div>
      <canvas ref={canvasRef} className={'h-full w-full'}></canvas>
    </div>
  )
}
