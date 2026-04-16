import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  HStack,
  Stack,
  Text,
  Badge,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown,
  History as HistoryIcon, 
  Play, 
  Pause, 
  RotateCcw,
  Square,
  Box as BoxIcon,
  Circle,
  BookOpen,
} from 'lucide-react'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'
import { buildBresenhamLine, buildDdaLine, type LineStep, type Point } from './algorithms/line'
import { evolutionaryGroups, pipelineGroups, type SubAlgorithm } from './data/topics'
import { useCgStore, type LineAlgorithm } from './store/cgStore'

const gridSize = 16
const cellSize = 32
const canvasSize = gridSize * cellSize

type ViewMode = 'history' | 'pipeline'

type LineContext = {
  dx: number
  dy: number
  dxRaw: number
  dyRaw: number
  steps: number
}

type AlgorithmMath = {
  title: string
  baseFormula: string
  liveCalculation: (step: LineStep, context: LineContext) => string
  description: string
  readHint: string
}

// 동적 수식 생성을 위한 유틸리티
const algorithmMath: Record<LineAlgorithm, AlgorithmMath> = {
  dda: {
    title: 'DDA (Digital Differential Analyzer)',
    baseFormula: 'S = \\max(|\\Delta x|, |\\Delta y|), \\quad x_i = x_0 + i\\frac{\\Delta x}{S}, \\quad y_i = y_0 + i\\frac{\\Delta y}{S}',
    liveCalculation: (step, context) => {
      if (context.steps === 0) return `P_0 = (${step.point.x}, ${step.point.y})`
      return `i=${step.values.index},\\quad x_i=${step.values.xFloat},\\quad y_i=${step.values.yFloat}\\Rightarrow pixel=(${step.point.x}, ${step.point.y})`
    },
    description: '연속 좌표 위를 같은 간격으로 샘플링하고, 매 샘플을 가장 가까운 정수 픽셀에 대응시킵니다.',
    readHint: '파란 픽셀은 반올림 결과입니다. 대각선에 가까운 실수 좌표가 어느 격자 칸으로 떨어지는지 보면 됩니다.',
  },
  bresenham: {
    title: 'Bresenham Algorithm',
    baseFormula: 'err_0 = |\\Delta x| - |\\Delta y|, \\quad e_2 = 2err, \\quad x/y\\ direction\\ is\\ chosen\\ by\\ e_2',
    liveCalculation: (step) => {
      const xMove = step.values.moveX === 1 ? 'x\\leftarrow x+s_x' : 'x\\ stays'
      const yMove = step.values.moveY === 1 ? 'y\\leftarrow y+s_y' : 'y\\ stays'
      return `err=${step.values.error},\\quad 2err=${step.values.doubledError}\\Rightarrow ${xMove},\\ ${yMove},\\ err_{next}=${step.values.nextError}`
    },
    description: '실수 좌표를 만들지 않고, 현재 픽셀이 이상적인 선에서 얼마나 벗어났는지만 정수 오차로 추적합니다.',
    readHint: '오차가 커지는 방향을 피하면서 x, y, 또는 대각선으로 이동합니다. 그래서 픽셀 경로가 빠르게 결정됩니다.',
  },
}

const isLineAlgorithm = (value: string): value is LineAlgorithm =>
  value === 'dda' || value === 'bresenham'

function App() {
  const {
    selectedTopic, algorithm, start, end, progress, isPlaying,
    setSelectedTopic, setAlgorithm, setStart, setEnd, setProgress, setIsPlaying,
  } = useCgStore()

  const [viewMode, setViewMode] = useState<ViewMode>('history')

  const dx_raw = end.x - start.x
  const dy_raw = end.y - start.y
  const dx = Math.abs(dx_raw)
  const dy = Math.abs(dy_raw)
  const steps = Math.max(dx, dy)

  const lineSteps = useMemo(
    () => (algorithm === 'dda' ? buildDdaLine(start, end) : buildBresenhamLine(start, end)),
    [algorithm, start, end],
  )
  const currentStep = lineSteps[Math.min(progress, lineSteps.length - 1)]

  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => {
      setProgress(progress >= lineSteps.length - 1 ? 0 : progress + 1)
    }, 450)
    return () => window.clearInterval(timer)
  }, [isPlaying, lineSteps.length, progress, setProgress])

  return (
    <Flex h="100vh" w="100vw" overflow="hidden" bg="var(--sketch-bg)">
      <Sidebar 
        viewMode={viewMode} setViewMode={setViewMode}
        selectedTopic={selectedTopic} algorithm={algorithm}
        onSelectTopic={setSelectedTopic} onSelectAlgo={setAlgorithm} 
      />

      <Box as="main" className="main-layout">
        <header className="dashboard-header">
          <HStack justify="space-between" w="100%">
            <Stack gap={0}>
              <Text className="hand-drawn-text" color="var(--sketch-accent)" fontSize="xl">연구 아카이브</Text>
              <Heading size="md" fontWeight="900" letterSpacing="-0.02em">CG-Archive</Heading>
            </Stack>
            <HStack gap={6}>
              <Box textAlign="right">
                <Text fontSize="10px" fontWeight="800" opacity={0.4}>COORDINATES</Text>
                <HStack gap={3}>
                  <Badge variant="outline" colorScheme="blue">P1({start.x}, {start.y})</Badge>
                  <Badge variant="outline" colorScheme="red">P2({end.x}, {end.y})</Badge>
                </HStack>
              </Box>
              <div style={{ width: '1px', height: '24px', background: 'var(--sketch-grid)' }} />
              <Badge colorScheme="purple" variant="solid" fontSize="10px" px={2}>V1.0 BETA</Badge>
            </HStack>
          </HStack>
        </header>

        <Box className="dashboard-content">
          {selectedTopic === 'line' ? (
            <>
              <Box className="canvas-area">
                <Box className="canvas-container sketch-border">
                  <RasterCanvas 
                    start={start} end={end} 
                    visibleSteps={lineSteps.slice(0, progress + 1)}
                    onUpdateStart={setStart}
                    onUpdateEnd={setEnd}
                  />
                </Box>
                <PlaybackControls
                  progress={progress}
                  totalSteps={lineSteps.length}
                  isPlaying={isPlaying}
                  onTogglePlaying={() => setIsPlaying(!isPlaying)}
                  onReset={() => setProgress(0)}
                />
                <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                  <MetricBox label="ΔX (너비)" value={dx_raw} />
                  <MetricBox label="ΔY (높이)" value={dy_raw} />
                  <MetricBox label="기울기(m)" value={dx === 0 ? '∞' : (dy_raw/dx_raw).toFixed(2)} />
                  <MetricBox label="연산 단계" value={steps} />
                </Grid>
              </Box>

              <aside className="inspector-area">
                <BeginnerPrimer />
                <ConceptSection algorithm={algorithm} />

                <section className="sketch-card sketch-border">
                  <Text className="eyebrow">이론적 수식</Text>
                  <Heading size="xs" mb={3}>{algorithmMath[algorithm].title}</Heading>
                  <Box className="math-box">
                    <BlockMath math={algorithmMath[algorithm].baseFormula} />
                  </Box>
                </section>

                <section className="sketch-card sketch-border" style={{ borderColor: 'var(--sketch-accent)' }}>
                  <Text className="eyebrow">실시간 상수 대입 연산</Text>
                  <Box className="math-box" bg="rgba(49, 130, 206, 0.03)">
                    <BlockMath math={algorithmMath[algorithm].liveCalculation(currentStep, { dx, dy, dxRaw: dx_raw, dyRaw: dy_raw, steps })} />
                  </Box>
                  <Text fontSize="10px" mt={2} color="var(--sketch-accent)" fontWeight="700">
                    * 드래그하여 좌표를 변경하면 상수가 즉시 업데이트됩니다.
                  </Text>
                </section>

                <section className="sketch-card sketch-border">
                  <Text className="eyebrow">읽는 순서</Text>
                  <Stack gap={2} mt={3} className="guide-list">
                    <Text><b>1.</b> 회색 점선은 이상적인 연속 선입니다.</Text>
                    <Text><b>2.</b> 파란 칸은 알고리즘이 선택한 실제 픽셀입니다.</Text>
                    <Text><b>3.</b> P1/P2를 드래그하면 ΔX, ΔY, 수식 상수가 즉시 바뀝니다.</Text>
                    <Text><b>4.</b> RUN을 누르면 픽셀이 선택되는 순서를 한 단계씩 볼 수 있습니다.</Text>
                  </Stack>
                  <Text className="algorithm-hint">{algorithmMath[algorithm].readHint}</Text>
                </section>

                <section className="sketch-card sketch-border" style={{ borderStyle: 'dashed' }}>
                  <Text className="eyebrow">연산 트레이스</Text>
                  <Box mt={2}>
                    {lineSteps.slice(Math.max(0, progress - 1), progress + 1).map((step, i) => (
                      <div key={i} className="trace-row" data-current={i === Math.min(progress, 1)}>
                        <Text opacity={0.5}>#{lineSteps.indexOf(step) + 1}</Text>
                        <Text fontWeight="800">픽셀: ({step.point.x}, {step.point.y})</Text>
                        <Text fontSize="10px" color="var(--sketch-accent)">{step.note}</Text>
                      </div>
                    ))}
                  </Box>
                </section>
              </aside>
            </>
          ) : (
            <ComingSoon />
          )}
        </Box>
      </Box>
    </Flex>
  )
}

function PlaybackControls({
  progress,
  totalSteps,
  isPlaying,
  onTogglePlaying,
  onReset,
}: {
  progress: number
  totalSteps: number
  isPlaying: boolean
  onTogglePlaying: () => void
  onReset: () => void
}) {
  return (
    <section className="playback-bar sketch-border">
      <HStack justify="space-between" gap={4} flexWrap="wrap">
        <HStack gap={3}>
          <Text className="eyebrow">시뮬레이터</Text>
          <Badge colorScheme="blue">STEP {progress + 1} / {totalSteps}</Badge>
        </HStack>
        <HStack gap={3}>
          <button className="primary-btn playback-main-btn" onClick={onTogglePlaying}>
            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
            <span>{isPlaying ? 'PAUSE' : 'RUN'}</span>
          </button>
          <button className="primary-btn playback-reset-btn" onClick={onReset} aria-label="처음으로">
            <RotateCcw size={16} />
          </button>
        </HStack>
      </HStack>
    </section>
  )
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-box sketch-border">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}

function BeginnerPrimer() {
  return (
    <section className="sketch-card sketch-border primer-card">
      <Text className="eyebrow">처음 보는 사람을 위한 시작점</Text>
      <Heading size="sm" mt={1} mb={3}>컴퓨터 그래픽스는 계산을 그림으로 바꾸는 과정입니다</Heading>
      <Stack gap={3} className="primer-copy">
        <Text>
          화면은 아주 작은 정사각형 픽셀의 격자입니다. 컴퓨터 그래픽스는 점, 선,
          삼각형, 빛, 카메라 같은 정보를 계산해서 어떤 픽셀을 어떤 색으로 칠할지
          결정하는 기술입니다.
        </Text>
        <Text>
          3D 그래픽스도 마지막에는 2D 화면의 픽셀로 끝납니다. 그래서 가장 먼저
          알아야 할 질문은 “수학적으로 존재하는 선을 화면의 픽셀 칸들로 어떻게
          바꿀까?”입니다. 지금 보는 DDA와 Bresenham은 그 첫 번째 답입니다.
        </Text>
      </Stack>
      <Grid className="learning-ladder" templateColumns="repeat(4, 1fr)" gap={2} mt={4}>
        <div><b>1</b><span>좌표</span></div>
        <div><b>2</b><span>픽셀 선택</span></div>
        <div><b>3</b><span>면과 삼각형</span></div>
        <div><b>4</b><span>3D 투영</span></div>
      </Grid>
    </section>
  )
}

type SidebarProps = {
  viewMode: ViewMode
  setViewMode: (viewMode: ViewMode) => void
  selectedTopic: string
  algorithm: LineAlgorithm
  onSelectTopic: (topic: string) => void
  onSelectAlgo: (algorithm: LineAlgorithm) => void
}

function Sidebar({
  viewMode,
  setViewMode,
  selectedTopic,
  algorithm,
  onSelectTopic,
  onSelectAlgo,
}: SidebarProps) {
  const groups = viewMode === 'history' ? evolutionaryGroups : pipelineGroups

  return (
    <aside className="sidebar">
      <Box className="sidebar-header">
        <HStack gap={3}>
          <Box bg="var(--sketch-ink)" p={1.5} borderRadius="md">
            <HistoryIcon color="white" size={18} />
          </Box>
          <Heading size="sm" letterSpacing="-0.04em">CG-Archive</Heading>
        </HStack>
        
        <HStack gap={1} mt={5} p={1} bg="var(--sketch-grid)" borderRadius="md">
          <button 
            className="algorithm-tab-btn" 
            style={{ fontSize: '10px', flex: 1, background: viewMode === 'history' ? 'white' : 'transparent', color: 'var(--sketch-ink)' }}
            onClick={() => setViewMode('history')}
          >
            HISTORY
          </button>
          <button 
            className="algorithm-tab-btn" 
            style={{ fontSize: '10px', flex: 1, background: viewMode === 'pipeline' ? 'white' : 'transparent', color: 'var(--sketch-ink)' }}
            onClick={() => setViewMode('pipeline')}
          >
            PIPELINE
          </button>
        </HStack>
      </Box>

      <Stack gap={1} overflowY="auto" flex="1" pr={2}>
        {groups.map((group) => (
          <Box key={group.groupTitle} mb={5}>
            <Text className="sidebar-group-title" borderBottom="1px solid var(--sketch-grid)" pb={1} mb={2}>{group.groupTitle}</Text>
            {group.items.map((topic) => (
              <Box key={topic.id}>
                <div 
                  className="tree-item" 
                  data-active={selectedTopic === topic.id}
                  onClick={() => onSelectTopic(topic.id)}
                  style={{ opacity: topic.status === 'ready' ? 1 : 0.4 }}
                >
                  {topic.children ? <ChevronDown size={14} /> : <Square size={10} />}
                  <Text truncate fontSize="12px" fontWeight={topic.status === 'ready' ? '800' : '500'}>{topic.title}</Text>
                </div>
                {topic.children && selectedTopic === topic.id && (
                  <Stack gap={0} mt={1} borderLeft="2px solid var(--sketch-grid)" ml={2}>
                    {topic.children.map((sub) => (
                      <SubAlgorithmItem
                        key={sub.id}
                        algorithm={algorithm}
                        sub={sub}
                        onSelectAlgo={onSelectAlgo}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            ))}
          </Box>
        ))}
      </Stack>
    </aside>
  )
}

function SubAlgorithmItem({
  algorithm,
  sub,
  onSelectAlgo,
}: {
  algorithm: LineAlgorithm
  sub: SubAlgorithm
  onSelectAlgo: (algorithm: LineAlgorithm) => void
}) {
  const selected = algorithm === sub.id

  return (
    <div
      className="tree-sub-item"
      data-active={selected}
      onClick={() => {
        if (isLineAlgorithm(sub.id)) onSelectAlgo(sub.id)
      }}
    >
      <Circle size={4} fill={selected ? 'var(--sketch-accent)' : 'none'} stroke="var(--sketch-accent)" />
      <Text truncate fontSize="11px">{sub.title}</Text>
    </div>
  )
}

function ConceptSection({ algorithm }: { algorithm: LineAlgorithm }) {
  return (
    <section className="concept-note">
      <Heading size="xs" display="flex" alignItems="center" gap={2} mb={2}>
        <BookOpen size={14} /> 핵심 아카이브 노트
      </Heading>
      {algorithm === 'dda' ? (
        <Stack gap={2} fontSize="11px">
          <Text>• <b>목표:</b> 시작점 P1에서 끝점 P2까지 일정한 간격으로 이동하며 픽셀을 고릅니다.</Text>
          <Text>• <b>핵심:</b> 긴 축을 기준으로 단계 수를 정하고, 매 단계마다 x와 y의 증가량을 더합니다.</Text>
          <Text>• <b>관찰:</b> 계산 중에는 실수 좌표가 나오지만 화면은 정수 픽셀만 칠할 수 있어서 반올림합니다.</Text>
          <Text>• <b>3D와의 연결:</b> 3D 모델의 모서리도 투영 후에는 결국 이런 2D 선 픽셀 선택 문제로 내려옵니다.</Text>
        </Stack>
      ) : (
        <Stack gap={2} fontSize="11px">
          <Text>• <b>목표:</b> 이상적인 선에 가장 가까운 픽셀을 빠르게 고릅니다.</Text>
          <Text>• <b>핵심:</b> 실수 좌표를 매번 계산하지 않고, 현재 오차가 어느 방향으로 커지는지만 추적합니다.</Text>
          <Text>• <b>관찰:</b> `2err` 값이 x 방향, y 방향, 대각선 이동 중 무엇을 선택할지 결정합니다.</Text>
          <Text>• <b>3D와의 연결:</b> 빠른 정수 판단은 래스터화의 기본 감각입니다. 삼각형 채우기와 깊이 테스트도 같은 식으로 픽셀 단위 판단을 반복합니다.</Text>
        </Stack>
      )}
    </section>
  )
}

type RasterCanvasProps = {
  start: Point
  end: Point
  visibleSteps: LineStep[]
  onUpdateStart: (point: Point) => void
  onUpdateEnd: (point: Point) => void
}

function RasterCanvas({ start, end, visibleSteps, onUpdateStart, onUpdateEnd }: RasterCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragMode, setDragMode] = useState<'start' | 'end' | 'drawing' | null>(null)

  const getGridCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 }
    const rect = svgRef.current.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left) / (rect.width / gridSize))
    const y = gridSize - 1 - Math.floor((clientY - rect.top) / (rect.height / gridSize))
    return {
      x: Math.max(0, Math.min(gridSize - 1, x)),
      y: Math.max(0, Math.min(gridSize - 1, y))
    }
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const coords = getGridCoords(event.clientX, event.clientY)
    setDragMode('drawing')
    onUpdateStart(coords)
    onUpdateEnd(coords)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragMode) return
    const coords = getGridCoords(event.clientX, event.clientY)
    if (dragMode === 'drawing' || dragMode === 'end') onUpdateEnd(coords)
    else if (dragMode === 'start') onUpdateStart(coords)
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragMode(null)
  }

  return (
    <svg 
      ref={svgRef} viewBox={`0 0 ${canvasSize} ${canvasSize}`} 
      className="raster-canvas" onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
      style={{ cursor: dragMode ? 'crosshair' : 'default' }}
    >
      {Array.from({ length: gridSize + 1 }, (_, i) => (
        <g key={i}>
          <line x1={i * cellSize} y1={0} x2={i * cellSize} y2={canvasSize} stroke="var(--sketch-grid)" strokeWidth={0.5} />
          <line x1={0} y1={i * cellSize} x2={canvasSize} y2={i * cellSize} stroke="var(--sketch-grid)" strokeWidth={0.5} />
        </g>
      ))}
      <line 
        x1={start.x * cellSize + cellSize/2} y1={(gridSize-1-start.y) * cellSize + cellSize/2}
        x2={end.x * cellSize + cellSize/2} y2={(gridSize-1-end.y) * cellSize + cellSize/2}
        stroke="var(--sketch-grid)" strokeWidth={3} strokeDasharray="6 4" opacity={0.5}
      />
      <AnimatePresence>
        {visibleSteps.map((step, i) => (
          <motion.g 
            key={`${step.point.x}-${step.point.y}-${i}`}
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          >
            <rect 
              className="pixel" x={step.point.x * cellSize} y={(gridSize-1-step.point.y) * cellSize}
              width={cellSize} height={cellSize}
            />
            <rect 
              fill="none" stroke="var(--sketch-ink)" strokeWidth={0.2}
              x={step.point.x * cellSize + 1} y={(gridSize-1-step.point.y) * cellSize + 1}
              width={cellSize - 2} height={cellSize - 2}
            />
          </motion.g>
        ))}
      </AnimatePresence>
      <DraggableEndpoint point={start} label="P1" color="var(--sketch-accent)" onPointerDown={() => setDragMode('start')} />
      <DraggableEndpoint point={end} label="P2" color="var(--sketch-red)" onPointerDown={() => setDragMode('end')} />
    </svg>
  )
}

function DraggableEndpoint({
  point,
  label,
  color,
  onPointerDown,
}: {
  point: Point
  label: string
  color: string
  onPointerDown: () => void
}) {
  const cx = point.x * cellSize + cellSize / 2
  const cy = (gridSize - 1 - point.y) * cellSize + cellSize / 2
  return (
    <g onPointerDown={(event) => { event.stopPropagation(); onPointerDown(); }} style={{ cursor: 'move' }}>
      <circle cx={cx} cy={cy} r={16} fill="transparent" />
      <circle cx={cx} cy={cy} r={8} fill="white" stroke={color} strokeWidth={3} />
      <text x={cx} y={cy - 16} textAnchor="middle" fontSize="16" fontWeight="900" fill={color} className="text-halo" style={{ fontFamily: 'var(--font-sketch)', pointerEvents: 'none' }}>
        {label}
      </text>
    </g>
  )
}

function ComingSoon() {
  return (
    <Box className="canvas-container sketch-border" gridColumn="span 2">
      <Stack align="center" gap={3} textAlign="center">
        <BoxIcon size={48} opacity={0.1} />
        <Heading className="hand-drawn-text" size="md">설계 중인 모델...</Heading>
      </Stack>
    </Box>
  )
}

export default App
