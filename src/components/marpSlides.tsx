import React, { useEffect, useState, useCallback } from 'react'
import { Marp } from '@marp-team/marp-react'
import { MarpOptions } from '@marp-team/marp-core'
import { IconButton } from './iconButton'
import slideStore from '../features/stores/slide'
import homeStore from '../features/stores/home'
import { processReceivedMessage } from './handlers'

interface MarpSlidesProps {
  markdown: string
}

const MarpSlides: React.FC<MarpSlidesProps> = ({ markdown }) => {
  const isPlaying = slideStore((state) => state.isPlaying)
  const currentSlide = slideStore((state) => state.currentSlide)
  const chatProcessingCount = homeStore((s) => s.chatProcessingCount)

  const slides: string[] = markdown.split('---').map((slide) => slide.trim())

  const readSlide = useCallback((slideIndex: number) => {
    const getCurrentLines = () => {
      const scripts = require('../../public/slides/demo/scripts.json')
      const currentScript = scripts.find(
        (script: { page: number }) => script.page === slideIndex
      )
      return currentScript ? currentScript.line : ''
    }

    const currentLines = getCurrentLines()
    console.log(currentLines)
    processReceivedMessage(currentLines)
  }, [])

  const nextSlide = useCallback(() => {
    slideStore.setState((state) => {
      const newSlide = Math.min(state.currentSlide + 1, slides.length - 1)
      if (isPlaying) {
        readSlide(newSlide)
      }
      return { currentSlide: newSlide }
    })
  }, [isPlaying, readSlide, slides.length])

  const prevSlide = () => {
    slideStore.setState({
      currentSlide: Math.max(currentSlide - 1, 0),
    })
  }

  const goToSlide = (index: number) => {
    slideStore.setState({
      currentSlide: index,
    })
  }

  const toggleIsPlaying = () => {
    const newIsPlaying = !isPlaying
    slideStore.setState({
      isPlaying: newIsPlaying,
    })
    if (newIsPlaying) {
      readSlide(currentSlide)
    }
  }

  useEffect(() => {
    if (
      chatProcessingCount === 0 &&
      isPlaying &&
      currentSlide < slides.length - 1
    ) {
      const timer = setTimeout(() => {
        nextSlide()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [chatProcessingCount, isPlaying, nextSlide, currentSlide, slides.length])

  const marpOptions: MarpOptions = {
    inlineSVG: true,
  }

  return (
    <div className="ml-16">
      <div
        style={{
          width: '60vw',
          height: 'calc(60vw * (9 / 16))',
          overflow: 'hidden',
          border: '2px solid #333',
          boxSizing: 'border-box',
          boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <Marp markdown={`${slides[currentSlide]}`} options={marpOptions} />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '20px',
        }}
      >
        <div style={{ flex: 1 }}></div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <IconButton
            iconName="24/Prev"
            disabled={currentSlide === 0 || isPlaying}
            onClick={prevSlide}
            isProcessing={false}
            className="bg-primary hover:bg-primary-hover disabled:bg-primary-disabled text-white rounded-16 py-8 px-16 text-center mx-16"
          ></IconButton>
          <IconButton
            iconName="24/Next"
            disabled={currentSlide === slides.length - 1 || isPlaying}
            onClick={nextSlide}
            isProcessing={false}
            className="bg-primary hover:bg-primary-hover disabled:bg-primary-disabled text-white rounded-16 py-8 px-16 text-center mx-16"
          ></IconButton>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton
            iconName={isPlaying ? '24/PauseAlt' : '24/Play'}
            onClick={toggleIsPlaying}
            isProcessing={false}
            className="bg-primary hover:bg-primary-hover disabled:bg-primary-disabled text-white rounded-16 py-8 px-16 text-center mx-16"
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '20px',
          display: 'none',
        }}
      >
        {[1, 2, 3, 4, 5].map((num) => (
          <button key={num} onClick={() => goToSlide(num - 1)}>
            {`Go to Slide ${num}`}
          </button>
        ))}
      </div>
    </div>
  )
}
export default MarpSlides
