"use client"
import React, {
  forwardRef,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react"
import { cn } from "../../lib/utils"

export function createAudioAnalyser(
  mediaStream,
  options = {}
) {
  const audioContext = new (window.AudioContext ||
    window.webkitAudioContext)()
  const source = audioContext.createMediaStreamSource(mediaStream)
  const analyser = audioContext.createAnalyser()
  if (options.fftSize) analyser.fftSize = options.fftSize
  if (options.smoothingTimeConstant !== undefined) {
    analyser.smoothingTimeConstant = options.smoothingTimeConstant
  }
  if (options.minDecibels !== undefined)
    analyser.minDecibels = options.minDecibels
  if (options.maxDecibels !== undefined)
    analyser.maxDecibels = options.maxDecibels
  source.connect(analyser)
  const cleanup = () => {
    source.disconnect()
    if (audioContext.state !== "closed") {
       audioContext.close()
    }
  }
  return { analyser, audioContext, cleanup }
}

export function useAudioVolume(
  mediaStream,
  options = { fftSize: 256, smoothingTimeConstant: 0.4 }
) {
  const [volume, setVolume] = useState(0)
  const volumeRef = useRef(0)
  const frameId = useRef()
  const memoizedOptions = useMemo(
    () => options,
    [
      options.fftSize,
      options.smoothingTimeConstant,
      options.minDecibels,
      options.maxDecibels,
    ]
  )
  useEffect(() => {
    if (!mediaStream) {
      setVolume(0)
      volumeRef.current = 0
      return
    }
    const { analyser, cleanup } = createAudioAnalyser(
      mediaStream,
      memoizedOptions
    )
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    let lastUpdate = 0
    const updateInterval = 1000 / 60 
    const updateVolume = (timestamp) => {
      if (timestamp - lastUpdate >= updateInterval) {
        analyser.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          let a = dataArray[i]
          if (i < 15) a = Math.min(255, a * 1.8) // Bass boost glow drastically
          sum += a * a
        }
        const targetVolume = Math.sqrt(sum / dataArray.length) / 255
        
        // Make the volume punchier
        const punchyVolume = Math.pow(targetVolume, 0.8) * 1.2
        
        // Fast attack, slow decay for zero latency
        let newVolume = volumeRef.current;
        if (punchyVolume > volumeRef.current) {
           newVolume = volumeRef.current * 0.4 + punchyVolume * 0.6;
        } else {
           newVolume = volumeRef.current * 0.7 + punchyVolume * 0.3;
        }
        
        if (Math.abs(newVolume - volumeRef.current) > 0.001) {
          volumeRef.current = newVolume
          setVolume(newVolume)
        }
        lastUpdate = timestamp
      }
      frameId.current = requestAnimationFrame(updateVolume)
    }
    frameId.current = requestAnimationFrame(updateVolume)
    return () => {
      cleanup()
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
    }
  }, [mediaStream, memoizedOptions])
  return volume
}

const multibandDefaults = {
  bands: 5,
  loPass: 100,
  hiPass: 600,
  updateInterval: 32,
  analyserOptions: { fftSize: 2048 },
}

const normalizeDb = (value) => {
  if (value === -Infinity) return 0
  const minDb = -100
  const maxDb = -10
  const db = 1 - (Math.max(minDb, Math.min(maxDb, value)) * -1) / 100
  return Math.sqrt(db)
}

export function useMultibandVolume(
  mediaStream,
  options = {}
) {
  const opts = useMemo(
    () => ({ ...multibandDefaults, ...options }),
    [
      options.bands,
      options.loPass,
      options.hiPass,
      options.updateInterval,
      options.analyserOptions?.fftSize,
      options.analyserOptions?.smoothingTimeConstant,
      options.analyserOptions?.minDecibels,
      options.analyserOptions?.maxDecibels,
    ]
  )
  const [frequencyBands, setFrequencyBands] = useState(() =>
    new Array(opts.bands).fill(0)
  )
  const bandsRef = useRef(new Array(opts.bands).fill(0))
  const frameId = useRef()
  useEffect(() => {
    if (!mediaStream) {
      const emptyBands = new Array(opts.bands).fill(0)
      setFrequencyBands(emptyBands)
      bandsRef.current = emptyBands
      return
    }
    const { analyser, cleanup } = createAudioAnalyser(
      mediaStream,
      opts.analyserOptions
    )
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Float32Array(bufferLength)
    const sliceStart = opts.loPass
    const sliceEnd = opts.hiPass
    const sliceLength = sliceEnd - sliceStart
    const chunkSize = Math.ceil(sliceLength / opts.bands)
    let lastUpdate = 0
    const updateInterval = opts.updateInterval
    const updateVolume = (timestamp) => {
      if (timestamp - lastUpdate >= updateInterval) {
        analyser.getFloatFrequencyData(dataArray)
        const chunks = new Array(opts.bands)
        for (let i = 0; i < opts.bands; i++) {
          let sum = 0
          let count = 0
          const startIdx = sliceStart + i * chunkSize
          const endIdx = Math.min(sliceStart + (i + 1) * chunkSize, sliceEnd)
          for (let j = startIdx; j < endIdx; j++) {
            sum += normalizeDb(dataArray[j])
            count++
          }
          chunks[i] = count > 0 ? sum / count : 0
        }
        let hasChanged = false
        for (let i = 0; i < chunks.length; i++) {
          if (Math.abs(chunks[i] - bandsRef.current[i]) > 0.01) {
            hasChanged = true
            break
          }
        }
        if (hasChanged) {
          bandsRef.current = chunks
          setFrequencyBands(chunks)
        }
        lastUpdate = timestamp
      }
      frameId.current = requestAnimationFrame(updateVolume)
    }
    frameId.current = requestAnimationFrame(updateVolume)
    return () => {
      cleanup()
      if (frameId.current) {
        cancelAnimationFrame(frameId.current)
      }
    }
  }, [mediaStream, opts])
  return frequencyBands
}

export const useBarAnimator = (
  state,
  columns,
  interval
) => {
  const indexRef = useRef(0)
  const [currentFrame, setCurrentFrame] = useState([])
  const animationFrameId = useRef(null)
  const sequence = useMemo(() => {
    if (state === "thinking" || state === "listening") {
      return generateListeningSequenceBar(columns)
    } else if (state === "connecting" || state === "initializing") {
      return generateConnectingSequenceBar(columns)
    } else if (state === undefined || state === "speaking") {
      return [new Array(columns).fill(0).map((_, idx) => idx)]
    } else {
      return [[]]
    }
  }, [state, columns])
  useEffect(() => {
    indexRef.current = 0
    setCurrentFrame(sequence[0] || [])
  }, [sequence])
  useEffect(() => {
    let startTime = performance.now()
    const animate = (time) => {
      const timeElapsed = time - startTime
      if (timeElapsed >= interval) {
        indexRef.current = (indexRef.current + 1) % sequence.length
        setCurrentFrame(sequence[indexRef.current] || [])
        startTime = time
      }
      animationFrameId.current = requestAnimationFrame(animate)
    }
    animationFrameId.current = requestAnimationFrame(animate)
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [interval, sequence])
  return currentFrame
}

const generateConnectingSequenceBar = (columns) => {
  const seq = []
  for (let x = 0; x < columns; x++) {
    seq.push([x, columns - 1 - x])
  }
  return seq
}
const generateListeningSequenceBar = (columns) => {
  const center = Math.floor(columns / 2)
  return [[center], [-1]]
}

export function useAudioFrequencyBands(mediaStream, barCount, demo, state, sensitivity, barRefs) {
  const prevBandsRef = useRef(new Array(barCount).fill(0.05));
  const options = useMemo(() => ({ fftSize: 256, smoothingTimeConstant: 0.4, minDecibels: -90, maxDecibels: -10 }), []);
  const fakeAnimationRef = useRef();

  // Track rolling maximum for Visual AGC
  const rollingMaxRef = useRef(0.1);

  useEffect(() => {
    if (demo) {
      if (state !== "speaking" && state !== "listening") {
        for (let i = 0; i < barCount; i++) {
           if (barRefs.current[i]) barRefs.current[i].style.height = `5%`;
        }
        return;
      }
      let lastUpdate = 0;
      const startTime = Date.now() / 1000;
      const updateFake = (timestamp) => {
        if (timestamp - lastUpdate >= 30) {
          const time = Date.now() / 1000 - startTime;
          const newBands = new Array(barCount);
          const halfCount = Math.floor(barCount / 2);
          
          let idx = 0;
          for (let i = halfCount - 1; i >= 0; i--) {
            const normalizedPosition = (i - halfCount) / halfCount;
            const wave = Math.sin(time * 2 + normalizedPosition * 5) * 0.2 * (1 - Math.abs(normalizedPosition));
            newBands[idx++] = Math.max(0.05, Math.min(1, 0.1 + wave + Math.random() * 0.05));
          }
          if (barCount % 2 !== 0) {
            newBands[idx++] = Math.max(0.05, Math.min(1, 0.1 + Math.random() * 0.05));
          }
          for (let i = 0; i < halfCount; i++) {
             const normalizedPosition = (i - halfCount) / halfCount;
             const wave = Math.sin(time * 2 + Math.abs(normalizedPosition) * 5) * 0.2 * (1 - Math.abs(normalizedPosition));
             newBands[idx++] = Math.max(0.05, Math.min(1, 0.1 + wave + Math.random() * 0.05));
          }
          
          const smoothed = new Array(barCount);
          for(let i=0; i<barCount; i++) {
             smoothed[i] = prevBandsRef.current[i] * 0.7 + newBands[i] * 0.3;
             if (barRefs.current[i]) {
                barRefs.current[i].style.height = `${smoothed[i] * 100}%`;
             }
          }
          prevBandsRef.current = smoothed;
          lastUpdate = timestamp;
        }
        fakeAnimationRef.current = requestAnimationFrame(updateFake);
      }
      fakeAnimationRef.current = requestAnimationFrame(updateFake);
      return () => cancelAnimationFrame(fakeAnimationRef.current);
    }
    
    if (!mediaStream) {
       for (let i = 0; i < barCount; i++) {
           if (barRefs.current[i]) barRefs.current[i].style.height = `5%`;
       }
       prevBandsRef.current = new Array(barCount).fill(0.05);
       return;
    }

    const { analyser, cleanup } = createAudioAnalyser(mediaStream, options);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let frameId;

    const updateBands = (timestamp) => {
        analyser.getByteFrequencyData(dataArray);

        const halfCount = Math.floor(barCount / 2);
        const usefulBins = Math.floor(analyser.frequencyBinCount * 0.8); // capture more harmonics

        let framePeak = 0;

        const logMap = new Array(halfCount);
        for (let i = 0; i < halfCount; i++) {
            const minIndex = 1;
            const maxIndex = usefulBins;
            const logMin = Math.log(minIndex);
            const logMax = Math.log(maxIndex);
            
            const scale1 = i / Math.max(1, halfCount - 1);
            const scale2 = (i + 1) / Math.max(1, halfCount - 1);
            
            const lowBound = Math.floor(Math.exp(logMin + scale1 * (logMax - logMin)));
            const highBound = Math.ceil(Math.exp(logMin + scale2 * (logMax - logMin)));
            const actualHigh = Math.max(lowBound + 1, highBound);

            let sum = 0;
            let count = 0;
            for (let j = lowBound; j < actualHigh && j < dataArray.length; j++) {
                let val = dataArray[j];
                // Bass boost 
                if (j < 15) val = Math.min(255, val * 1.5);
                sum += val;
                count++;
            }
            let avg = count > 0 ? (sum / count) : 0;
            const normalized = (avg / 255) * sensitivity;
            logMap[i] = Math.min(1, normalized);
            if (normalized > framePeak) framePeak = normalized;
        }

        // Auto Gain Control: gradually decay peak, jump to new peaks instantly
        if (framePeak > rollingMaxRef.current) {
            rollingMaxRef.current = framePeak;
        } else {
            rollingMaxRef.current = rollingMaxRef.current * 0.99 + framePeak * 0.01;
            // minimum visual floor multiplier to prevent pure static scaling
            if (rollingMaxRef.current < 0.2) rollingMaxRef.current = 0.2; 
        }

        const newBars = new Array(barCount);
        let idx = 0;
        
        // Mirror data on the left (treble to bass)
        for (let i = halfCount - 1; i >= 0; i--) {
          newBars[idx++] = Math.max(0.05, Math.min(1, logMap[i] / rollingMaxRef.current));
        }
        
        // Exact middle bar (lowest bass)
        if (barCount % 2 !== 0) {
          let val = dataArray[1] || 0;
          val = Math.min(255, val * 1.5); // Bass boost
          const normalized = (val / 255) * sensitivity;
          newBars[idx++] = Math.max(0.05, Math.min(1, normalized / rollingMaxRef.current));
        }
        
        // Mirror data on the right (bass to treble)
        for (let i = 0; i < halfCount; i++) {
          newBars[idx++] = Math.max(0.05, Math.min(1, logMap[i] / rollingMaxRef.current));
        }

        // Apply fast-attack interpolation (EMA) directly to DOM ref elements
        const smoothed = new Array(barCount);
        for (let i = 0; i < barCount; i++) {
          const current = prevBandsRef.current[i] || 0.05;
          const target = newBars[i];
          if (target > current) {
             // Smoothened attack
             smoothed[i] = current * 0.4 + target * 0.6;
          } else {
             // Smooth fall (slow decay)
             smoothed[i] = current * 0.7 + target * 0.3;
          }

          if (barRefs.current[i]) {
            barRefs.current[i].style.height = `${Math.max(4, smoothed[i] * 100)}%`;
          }
        }

        prevBandsRef.current = smoothed;

      frameId = requestAnimationFrame(updateBands);
    };

    frameId = requestAnimationFrame(updateBands);
    
    return () => {
      cleanup();
      cancelAnimationFrame(frameId);
    };
  }, [mediaStream, barCount, sensitivity, demo, state, options, barRefs]);
}

const BarVisualizerComponent = forwardRef(
  (
    {
      state,
      barCount = 75,
      mediaStream,
      minHeight = 4,
      maxHeight = 100,
      demo = false,
      centerAlign = false,
      sensitivity = 1.0,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const barsContainerRef = useRef(null);
    const barRefs = useRef([]);

    useAudioFrequencyBands(mediaStream, barCount, demo, state, sensitivity, barRefs);

    const highlightedIndices = useBarAnimator(
      state,
      barCount,
      state === "connecting"
        ? 2000 / barCount
        : state === "thinking"
          ? 150
          : state === "listening"
            ? 500
            : 1000
    )

    // Pre-allocate items to skip re-renders since React State doesn't drive height anymore
    const items = useMemo(() => new Array(barCount).fill(0), [barCount]);

    return (
      <div
        ref={(node) => {
          barsContainerRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
        }}
        data-state={state}
        className={cn(
          "relative flex justify-between gap-0.5 sm:gap-1",
          centerAlign ? "items-center" : "items-end",
          "h-48 w-full overflow-hidden px-2 sm:px-8",
          className
        )}
        style={{
          ...style,
          maskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 40%, black 60%, transparent 100%)",
        }}
        {...props}
      >
        {items.map((_, index) => {
          const isHighlighted = highlightedIndices?.includes(index) ?? false
          return (
            <Bar
              key={index}
              ref={(el) => (barRefs.current[index] = el)}
              isHighlighted={isHighlighted}
              state={state}
            />
          )
        })}
      </div>
    )
  }
)

const Bar = memo(forwardRef(({ isHighlighted, state }, ref) => (
  <div
    ref={ref}
    data-highlighted={isHighlighted}
    className={cn(
      "flex-1 transition-colors duration-200",
      "rounded-full mx-[1px] min-w-[2px]",
      "bg-zinc-800 data-[highlighted=true]:bg-white",
      state === "thinking" && isHighlighted && "animate-pulse"
    )}
    style={{
      height: "5%",
      animationDuration: state === "thinking" ? "300ms" : undefined,
    }}
  />
)))
Bar.displayName = "Bar"
export const BarVisualizer = memo(BarVisualizerComponent, (prevProps, nextProps) => {
  return (
    prevProps.state === nextProps.state &&
    prevProps.barCount === nextProps.barCount &&
    prevProps.mediaStream === nextProps.mediaStream &&
    prevProps.minHeight === nextProps.minHeight &&
    prevProps.maxHeight === nextProps.maxHeight &&
    prevProps.demo === nextProps.demo &&
    prevProps.centerAlign === nextProps.centerAlign &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.style) === JSON.stringify(nextProps.style)
  )
})
BarVisualizerComponent.displayName = "BarVisualizerComponent"
BarVisualizer.displayName = "BarVisualizer"

export const LiveWaveform = ({
  active = false,
  processing = false,
  deviceId,
  barWidth = 3,
  barGap = 1,
  barRadius = 1.5,
  barColor,
  fadeEdges = true,
  fadeWidth = 24,
  barHeight: baseBarHeight = 4,
  height = 64,
  sensitivity = 1,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  historySize = 60,
  updateRate = 30,
  mode = "static",
  onError,
  onStreamReady,
  onStreamEnd,
  className,
  stream, 
  ...props
}) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const historyRef = useRef([])
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const streamRef = useRef(null)
  const animationRef = useRef(0)
  const lastUpdateRef = useRef(0)
  const processingAnimationRef = useRef(null)
  const lastActiveDataRef = useRef([])
  const transitionProgressRef = useRef(0)
  const staticBarsRef = useRef([])
  const needsRedrawRef = useRef(true)
  const gradientCacheRef = useRef(null)
  const lastWidthRef = useRef(0)

  const heightStyle = typeof height === "number" ? `${height}px` : height

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }

      gradientCacheRef.current = null
      lastWidthRef.current = rect.width
      needsRedrawRef.current = true
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  useEffect(() => {
    if (processing && !active) {
      let time = 0
      transitionProgressRef.current = 0

      const animateProcessing = () => {
        time += 0.03
        transitionProgressRef.current = Math.min(
          1,
          transitionProgressRef.current + 0.02
        )

        const processingData = []
        const barCount = Math.floor(
          (containerRef.current?.getBoundingClientRect().width || 200) /
            (barWidth + barGap)
        )

        if (mode === "static") {
          const halfCount = Math.floor(barCount / 2)

          for (let i = 0; i < barCount; i++) {
            const normalizedPosition = (i - halfCount) / halfCount
            const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4

            const wave1 = Math.sin(time * 1.5 + normalizedPosition * 3) * 0.25
            const wave2 = Math.sin(time * 0.8 - normalizedPosition * 2) * 0.2
            const wave3 = Math.cos(time * 2 + normalizedPosition) * 0.15
            const combinedWave = wave1 + wave2 + wave3
            const processingValue = (0.2 + combinedWave) * centerWeight

            let finalValue = processingValue
            if (
              lastActiveDataRef.current.length > 0 &&
              transitionProgressRef.current < 1
            ) {
              const lastDataIndex = Math.min(
                i,
                lastActiveDataRef.current.length - 1
              )
              const lastValue = lastActiveDataRef.current[lastDataIndex] || 0
              finalValue =
                lastValue * (1 - transitionProgressRef.current) +
                processingValue * transitionProgressRef.current
            }

            processingData.push(Math.max(0.05, Math.min(1, finalValue)))
          }
        } else {
          for (let i = 0; i < barCount; i++) {
            const normalizedPosition = (i - barCount / 2) / (barCount / 2)
            const centerWeight = 1 - Math.abs(normalizedPosition) * 0.4

            const wave1 = Math.sin(time * 1.5 + i * 0.15) * 0.25
            const wave2 = Math.sin(time * 0.8 - i * 0.1) * 0.2
            const wave3 = Math.cos(time * 2 + i * 0.05) * 0.15
            const combinedWave = wave1 + wave2 + wave3
            const processingValue = (0.2 + combinedWave) * centerWeight

            let finalValue = processingValue
            if (
              lastActiveDataRef.current.length > 0 &&
              transitionProgressRef.current < 1
            ) {
              const lastDataIndex = Math.floor(
                (i / barCount) * lastActiveDataRef.current.length
              )
              const lastValue = lastActiveDataRef.current[lastDataIndex] || 0
              finalValue =
                lastValue * (1 - transitionProgressRef.current) +
                processingValue * transitionProgressRef.current
            }

            processingData.push(Math.max(0.05, Math.min(1, finalValue)))
          }
        }

        if (mode === "static") {
          staticBarsRef.current = processingData
        } else {
          historyRef.current = processingData
        }

        needsRedrawRef.current = true
        processingAnimationRef.current =
          requestAnimationFrame(animateProcessing)
      }

      animateProcessing()

      return () => {
        if (processingAnimationRef.current) {
          cancelAnimationFrame(processingAnimationRef.current)
        }
      }
    } else if (!active && !processing) {
      if (processingAnimationRef.current) {
        cancelAnimationFrame(processingAnimationRef.current)
        processingAnimationRef.current = null
      }
      const hasData =
        mode === "static"
          ? staticBarsRef.current.length > 0
          : historyRef.current.length > 0

      if (hasData) {
        let fadeProgress = 0
        const fadeToIdle = () => {
          fadeProgress += 0.03
          if (fadeProgress < 1) {
            if (mode === "static") {
              staticBarsRef.current = staticBarsRef.current.map(
                (value) => value * (1 - fadeProgress)
              )
            } else {
              historyRef.current = historyRef.current.map(
                (value) => value * (1 - fadeProgress)
              )
            }
            needsRedrawRef.current = true
            requestAnimationFrame(fadeToIdle)
          } else {
            if (mode === "static") {
              staticBarsRef.current = []
            } else {
              historyRef.current = []
            }
            needsRedrawRef.current = true
          }
        }
        fadeToIdle()
      } else {
         
         const time = Date.now() / 1000;
         const barCount = Math.floor(
          (containerRef.current?.getBoundingClientRect().width || 200) /
            (barWidth + barGap)
        )
         const idleData = [];
         for (let i = 0; i < barCount; i++) {
            const normalizedPosition = (i - barCount / 2) / (barCount / 2);
            const centerWeight = 1 - Math.abs(normalizedPosition) * 0.8;
            const wave = Math.sin(time + i * 0.2) * 0.1 * Math.max(0, centerWeight);
            idleData.push(0.05 + wave);
         }
         if (mode === 'static') staticBarsRef.current = idleData;
         else historyRef.current = idleData;
         needsRedrawRef.current = true;
         if (!active && !processing) {
             processingAnimationRef.current = requestAnimationFrame(() => {
                 let t = 0;
                 const animateIdle = () => {
                    t += 0.02;
                    const bCount = Math.floor(
                      (containerRef.current?.getBoundingClientRect().width || 200) /
                        (barWidth + barGap)
                    );
                    const dat = [];
                    for(let i=0; i<bCount; i++) {
                       const p = (i - bCount/2)/(bCount/2);
                       const w = 1 - Math.abs(p)*0.8;
                       dat.push(0.05 + Math.sin(t*2 + i*0.2)*0.05*Math.max(0,w));
                    }
                    if(mode==='static') staticBarsRef.current = dat;
                    else historyRef.current = dat;
                    needsRedrawRef.current = true;
                    if(!active && !processing) processingAnimationRef.current = requestAnimationFrame(animateIdle);
                 };
                 animateIdle();
             });
         }
      }
    }
  }, [processing, active, barWidth, barGap, mode])

  useEffect(() => {
    if (!active) {
      if (!stream && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        onStreamEnd?.()
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(e=>console.log(e))
        audioContextRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
      return
    }

    const setupMicrophone = async () => {
      try {
        const s = stream || await navigator.mediaDevices.getUserMedia({
          audio: deviceId
            ? {
                deviceId: { exact: deviceId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
        })
        if (!streamRef.current || streamRef.current.id !== s.id) {
           streamRef.current = s;
           onStreamReady?.(s)
        }

        const AudioContextConstructor =
          window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContextConstructor()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = fftSize
        analyser.smoothingTimeConstant = smoothingTimeConstant

        const source = audioContext.createMediaStreamSource(s)
        source.connect(analyser)

        audioContextRef.current = audioContext
        analyserRef.current = analyser

        historyRef.current = []
      } catch (error) {
        console.error(error);
        onError?.(error)
      }
    }

    setupMicrophone()

    return () => {
      if (!stream && streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        onStreamEnd?.()
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close().catch(e=>console.log(e))
        audioContextRef.current = null
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = 0
      }
    }
  }, [
    active,
    stream,
    deviceId,
    fftSize,
    smoothingTimeConstant,
    onError,
    onStreamReady,
    onStreamEnd,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId

    const animate = (currentTime) => {
      const rect = canvas.getBoundingClientRect()

      if (active && currentTime - lastUpdateRef.current > updateRate) {
        lastUpdateRef.current = currentTime

        if (analyserRef.current) {
          const dataArray = new Uint8Array(
            analyserRef.current.frequencyBinCount
          )
          analyserRef.current.getByteFrequencyData(dataArray)

          if (mode === "static") {
            const startFreq = Math.floor(dataArray.length * 0.05)
            const endFreq = Math.floor(dataArray.length * 0.4)
            const relevantData = dataArray.slice(startFreq, endFreq)

            const barCount = Math.floor(rect.width / (barWidth + barGap))
            const halfCount = Math.floor(barCount / 2)
            const newBars = []

            for (let i = halfCount - 1; i >= 0; i--) {
              const dataIndex = Math.floor(
                (i / halfCount) * relevantData.length
              )
              const value = Math.min(
                1,
                (relevantData[dataIndex] / 255) * sensitivity
              )
              newBars.push(Math.max(0.05, value))
            }

            for (let i = 0; i < halfCount; i++) {
              const dataIndex = Math.floor(
                (i / halfCount) * relevantData.length
              )
              const value = Math.min(
                1,
                (relevantData[dataIndex] / 255) * sensitivity
              )
              newBars.push(Math.max(0.05, value))
            }

            staticBarsRef.current = newBars
            lastActiveDataRef.current = newBars
          } else {
            let sum = 0
            const startFreq = Math.floor(dataArray.length * 0.05)
            const endFreq = Math.floor(dataArray.length * 0.4)
            const relevantData = dataArray.slice(startFreq, endFreq)

            for (let i = 0; i < relevantData.length; i++) {
              sum += relevantData[i]
            }
            const average = (sum / relevantData.length / 255) * sensitivity

            historyRef.current.push(Math.min(1, Math.max(0.05, average)))
            lastActiveDataRef.current = [...historyRef.current]

            if (historyRef.current.length > historySize) {
              historyRef.current.shift()
            }
          }
          needsRedrawRef.current = true
        }
      }

      if (!needsRedrawRef.current && !active && !processing) {
        rafId = requestAnimationFrame(animate)
        return
      }

      needsRedrawRef.current = active || processing
      ctx.clearRect(0, 0, rect.width, rect.height)

      const computedBarColor =
        barColor ||
        (() => {
          const style = getComputedStyle(canvas)
          const color = style.color
          return color || "#10b981" 
        })()

      const step = barWidth + barGap
      const barCount = Math.floor(rect.width / step)
      const centerY = rect.height / 2

      if (mode === "static") {
        const dataToRender = processing
          ? staticBarsRef.current
          : active
            ? staticBarsRef.current
            : staticBarsRef.current.length > 0
              ? staticBarsRef.current
              : []

        for (let i = 0; i < barCount && i < dataToRender.length; i++) {
          const value = dataToRender[i] || 0.1
          const x = i * step
          const barHeight = Math.max(baseBarHeight, value * rect.height * 0.8)
          const y = centerY - barHeight / 2

          ctx.fillStyle = computedBarColor
          ctx.globalAlpha = 0.4 + value * 0.6

          if (barRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(x, y, barWidth, barHeight, barRadius)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barWidth, barHeight)
          }
        }
      } else {
        for (let i = 0; i < barCount && i < historyRef.current.length; i++) {
          const dataIndex = historyRef.current.length - 1 - i
          const value = historyRef.current[dataIndex] || 0.1
          const x = rect.width - (i + 1) * step
          const barHeight = Math.max(baseBarHeight, value * rect.height * 0.8)
          const y = centerY - barHeight / 2

          ctx.fillStyle = computedBarColor
          ctx.globalAlpha = 0.4 + value * 0.6

          if (barRadius > 0) {
            ctx.beginPath()
            ctx.roundRect(x, y, barWidth, barHeight, barRadius)
            ctx.fill()
          } else {
            ctx.fillRect(x, y, barWidth, barHeight)
          }
        }
      }

      if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
        if (!gradientCacheRef.current || lastWidthRef.current !== rect.width) {
          const gradient = ctx.createLinearGradient(0, 0, rect.width, 0)
          const fadePercent = Math.min(0.3, fadeWidth / rect.width)

          gradient.addColorStop(0, "rgba(255,255,255,1)")
          gradient.addColorStop(fadePercent, "rgba(255,255,255,0)")
          gradient.addColorStop(1 - fadePercent, "rgba(255,255,255,0)")
          gradient.addColorStop(1, "rgba(255,255,255,1)")

          gradientCacheRef.current = gradient
          lastWidthRef.current = rect.width
        }

        ctx.globalCompositeOperation = "destination-out"
        ctx.fillStyle = gradientCacheRef.current
        ctx.fillRect(0, 0, rect.width, rect.height)
        ctx.globalCompositeOperation = "source-over"
      }

      ctx.globalAlpha = 1

      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [
    active,
    processing,
    sensitivity,
    updateRate,
    historySize,
    barWidth,
    baseBarHeight,
    barGap,
    barRadius,
    barColor,
    fadeEdges,
    fadeWidth,
    mode,
  ])

  return (
    <div
      className={cn("relative h-full w-full", className)}
      ref={containerRef}
      style={{ height: heightStyle }}
      aria-label={
        active
          ? "Live audio waveform"
          : processing
            ? "Processing audio"
            : "Audio waveform idle"
      }
      role="img"
      {...props}
    >
      <canvas
        className="block h-full w-full"
        ref={canvasRef}
        aria-hidden="true"
      />
    </div>
  )
}
