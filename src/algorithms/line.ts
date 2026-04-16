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
        values: {
          index: 0,
          xFloat: start.x,
          yFloat: start.y,
          xIncrement: 0,
          yIncrement: 0,
        },
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
      note: `실수 좌표 (${roundForDisplay(x)}, ${roundForDisplay(y)})를 가장 가까운 픽셀로 반올림`,
      values: {
        index,
        xFloat: roundForDisplay(x),
        yFloat: roundForDisplay(y),
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
    const doubledError = 2 * error
    const moveX = doubledError > -dy
    const moveY = doubledError < dx
    let nextError = error

    if (moveX) nextError -= dy
    if (moveY) nextError += dx

    points.push({
      point: { x: x0, y: y0 },
      note: moveX && moveY
        ? '오차가 대각선 이동을 선택'
        : moveX
          ? '오차가 x 방향 이동을 선택'
          : moveY
            ? '오차가 y 방향 이동을 선택'
            : '마지막 픽셀',
      values: {
        index,
        error: errorBefore,
        doubledError,
        nextError,
        dx,
        dy,
        moveX: moveX ? 1 : 0,
        moveY: moveY ? 1 : 0,
      },
    })

    if (x0 === x1 && y0 === y1) break

    if (moveX) {
      x0 += sx
    }
    if (moveY) {
      y0 += sy
    }
    error = nextError
    index += 1
  }

  return points
}
