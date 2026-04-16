export type Point = {
  x: number
  y: number
}

export type LineStep = {
  point: Point
  note: string
  values: Record<string, number>
}

const roundForDisplay = (value: number) => Number(value.toFixed(3))

export const buildDdaLine = (start: Point, end: Point): LineStep[] => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const steps = Math.max(Math.abs(dx), Math.abs(dy))

  if (steps === 0) {
    return [
      {
        point: start,
        note: '시작점과 끝점이 같은 한 픽셀',
        values: { x: start.x, y: start.y },
      },
    ]
  }

  const xIncrement = dx / steps
  const yIncrement = dy / steps

  return Array.from({ length: steps + 1 }, (_, index) => {
    const x = start.x + xIncrement * index
    const y = start.y + yIncrement * index

    return {
      point: { x: Math.round(x), y: Math.round(y) },
      note: `${index}번째 샘플을 가장 가까운 픽셀로 반올림`,
      values: {
        x: roundForDisplay(x),
        y: roundForDisplay(y),
        xIncrement: roundForDisplay(xIncrement),
        yIncrement: roundForDisplay(yIncrement),
      },
    }
  })
}

export const buildBresenhamLine = (start: Point, end: Point): LineStep[] => {
  const points: LineStep[] = []
  let x0 = start.x
  let y0 = start.y
  const x1 = end.x
  const y1 = end.y
  const dx = Math.abs(x1 - x0)
  const dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let error = dx - dy
  let index = 0

  while (true) {
    const errorBefore = error
    points.push({
      point: { x: x0, y: y0 },
      note: `${index}번째 정수 격자점 선택`,
      values: {
        error: errorBefore,
        dx,
        dy,
      },
    })

    if (x0 === x1 && y0 === y1) break

    const doubledError = 2 * error
    if (doubledError > -dy) {
      error -= dy
      x0 += sx
    }
    if (doubledError < dx) {
      error += dx
      y0 += sy
    }
    index += 1
  }

  return points
}
