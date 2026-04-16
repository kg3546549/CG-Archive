import { useEffect, useMemo, useState, useRef } from 'react'
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
import { InlineMath, BlockMath } from 'react-katex'
import { buildBresenhamLine, buildDdaLine, type Point } from './algorithms/line'
import { evolutionaryGroups, pipelineGroups } from './data/topics'
import { useCgStore, type LineAlgorithm } from './store/cgStore'

const gridSize = 16
const cellSize = 32
const canvasSize = gridSize * cellSize

// 동적 수식 생성을 위한 유틸리티
const algorithmMath: Record<LineAlgorithm, { 
  title: string; 
  baseFormula: string; 
  liveCalculation: (p: any, ctx: any) => string;
  description: string;
}> = {
  dda: {
    title: 'DDA (Digital Differential Analyzer)',
    baseFormula: 'x_{k+1} = x_k + \\frac{\\Delta x}{S}, \\quad y_{k+1} = y_k + \\frac{\\Delta y}{S}',
    liveCalculation: (p, ctx) => {
      const incX = (ctx.dx_raw / ctx.steps).toFixed(2);
      const incY = (ctx.dy_raw / ctx.steps).toFixed(2);
      return `x_{k+1} = ${p.point.x} + ${incX}, \\quad y_{k+1} = ${p.point.y} + ${incY}`;
    },
    description: '연속적인 선의 기울기를 누적하여 픽셀을 생성합니다.'
  },
  bresenham: {
    title: 'Bresenham Algorithm',
    baseFormula: 'p_{k+1} = p_k + 2\\Delta y - 2\\Delta x \\cdot d',
    liveCalculation: (p, ctx) => {
      const pk = p.values.p || 0;
      const dy2 = 2 * ctx.dy;
      const dxdy2 = 2 * (ctx.dy - ctx.dx);
      const nextCalc = pk < 0 ? `+ ${dy2}` : `+ ${dxdy2}`;
      return `p_{k+1} = ${pk} ${nextCalc} = ${p.values.p_next || '?'}`;
    },
    description: '오직 정수 연산만으로 다음 픽셀의 오차를 계산합니다.'
  }
}

function App() {
  const {
    selectedTopic, algorithm, start, end, progress, isPlaying,
    setSelectedTopic, setAlgorithm, setStart, setEnd, setProgress, setIsPlaying,
  } = useCgStore()

  const [viewMode, setViewMode] = useState<'history' | 'pipeline'>('history')

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
                <Grid templateColumns="repeat(4, 1fr)" gap={4}>
                  <MetricBox label="ΔX (너비)" value={dx_raw} />
                  <MetricBox label="ΔY (높이)" value={dy_raw} />
                  <MetricBox label="기울기(m)" value={dx === 0 ? '∞' : (dy_raw/dx_raw).toFixed(2)} />
                  <MetricBox label="연산 단계" value={steps} />
                </Grid>
              </Box>

              <aside className="inspector-area">
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
                    <BlockMath math={algorithmMath[algorithm].liveCalculation(currentStep, { dx, dy, dx_raw, dy_raw, steps })} />
                  </Box>
                  <Text fontSize="10px" mt={2} color="var(--sketch-accent)" fontWeight="700">
                    * 드래그하여 좌표를 변경하면 상수가 즉시 업데이트됩니다.
                  </Text>
                </section>

                <section className="sketch-card sketch-border">
                  <HStack justify="space-between" mb={3}>
                    <Text className="eyebrow">시뮬레이터</Text>
                    <Badge colorScheme="blue">STEP {progress + 1}</Badge>
                  </HStack>
                  <HStack gap={3}>
                    <button className="primary-btn" style={{ flex: 1 }} onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                      <span>{isPlaying ? 'PAUSE' : 'RUN'}</span>
                    </button>
                    <button className="primary-btn" style={{ background: 'var(--sketch-grid)', color: 'var(--sketch-ink)' }} onClick={() => setProgress(0)}>
                      <RotateCcw size={16} />
                    </button>
                  </HStack>
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

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-box sketch-border">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  )
}

function Sidebar({ viewMode, setViewMode, selectedTopic, algorithm, onSelectTopic, onSelectAlgo }: any) {
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
                  <Text isTruncated fontSize="12px" fontWeight={topic.status === 'ready' ? '800' : '500'}>{topic.title}</Text>
                </div>
                {topic.children && selectedTopic === topic.id && (
                  <Stack gap={0} mt={1} borderLeft="2px solid var(--sketch-grid)" ml={2}>
                    {topic.children.map((sub) => (
                      <div 
                        key={sub.id} 
                        className="tree-sub-item" 
                        data-active={algorithm === sub.id}
                        onClick={() => onSelectAlgo(sub.id as any)}
                      >
                        <Circle size={4} fill={algorithm === sub.id ? "var(--sketch-accent)" : "none"} stroke="var(--sketch-accent)" />
                        <Text isTruncated fontSize="11px">{sub.title}</Text>
                      </div>
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

function ConceptSection({ algorithm }: { algorithm: LineAlgorithm }) {
  return (
    <section className="concept-note">
      <Heading size="xs" display="flex" alignItems="center" gap={2} mb={2}>
        <BookOpen size={14} /> 핵심 아카이브 노트
      </Heading>
      {algorithm === 'dda' ? (
        <Stack gap={1.5} fontSize="11px">
          <Text>• <b>원리:</b> 선의 기울기를 매 단계마다 더해나가는 방식입니다.</Text>
          <Text>• <b>수식:</b> 현재 좌표에 $dy/dx$ 증분값을 더하고 반올림합니다.</Text>
          <Text>• <b>특징:</b> 부동 소수점 연산이 수반되어 하드웨어 비용이 발생합니다.</Text>
        </Stack>
      ) : (
        <Stack gap={1.5} fontSize="11px">
          <Text>• <b>원리:</b> 정수 기반의 <b>결정 변수(p)</b>로 다음 픽셀을 고릅니다.</Text>
          <Text>• <b>수식:</b> 이전 오차값에 따라 다음 오차를 누적 합산합니다.</Text>
          <Text>• <b>특징:</b> 곱셈과 나눗셈 없는 순수 정수 연산으로 속도가 매우 빠릅니다.</Text>
        </Stack>
      )}
    </section>
  )
}

function RasterCanvas({ start, end, visibleSteps, onUpdateStart, onUpdateEnd }: any) {
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getGridCoords(e.clientX, e.clientY)
    setDragMode('drawing')
    onUpdateStart(coords)
    onUpdateEnd(coords)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragMode) return
    const coords = getGridCoords(e.clientX, e.clientY)
    if (dragMode === 'drawing' || dragMode === 'end') onUpdateEnd(coords)
    else if (dragMode === 'start') onUpdateStart(coords)
  }

  const handleMouseUp = () => setDragMode(null)

  return (
    <svg 
      ref={svgRef} viewBox={`0 0 ${canvasSize} ${canvasSize}`} 
      className="raster-canvas" onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
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
        {visibleSteps.map((step: any, i: number) => (
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
      <DraggableEndpoint point={start} label="P1" color="var(--sketch-accent)" onMouseDown={() => setDragMode('start')} />
      <DraggableEndpoint point={end} label="P2" color="var(--sketch-red)" onMouseDown={() => setDragMode('end')} />
    </svg>
  )
}

function DraggableEndpoint({ point, label, color, onMouseDown }: any) {
  const cx = point.x * cellSize + cellSize / 2
  const cy = (gridSize - 1 - point.y) * cellSize + cellSize / 2
  return (
    <g onMouseDown={(e) => { e.stopPropagation(); onMouseDown(); }} style={{ cursor: 'move' }}>
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
