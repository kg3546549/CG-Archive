export type TopicStatus = 'ready' | 'soon'

export type SubAlgorithm = {
  id: string
  title: string
  status: TopicStatus
}

export type Topic = {
  id: string
  title: string
  description: string
  status: TopicStatus
  children?: SubAlgorithm[]
}

export type TopicGroup = {
  groupTitle: string
  items: Topic[]
}

// 발전사별 상세 구조 (Historical Evolution)
export const evolutionaryGroups: TopicGroup[] = [
  {
    groupTitle: "01 기초 래스터화 (1960s-70s)",
    items: [
      {
        id: 'line',
        title: '선형 래스터화',
        description: 'DDA와 Bresenham의 혁명',
        status: 'ready',
        children: [
          { id: 'dda', title: 'DDA 알고리즘', status: 'ready' },
          { id: 'bresenham', title: 'Bresenham 알고리즘', status: 'ready' }
        ]
      },
      {
        id: 'circle',
        title: '원 및 곡선 생성',
        description: 'Midpoint 원 알고리즘',
        status: 'soon'
      },
      {
        id: 'filling',
        title: '영역 채우기 (2D)',
        description: '스캔라인 및 시드 채우기',
        status: 'soon'
      }
    ]
  },
  {
    groupTitle: "02 기하학적 정립 (1980s)",
    items: [
      { id: 'transform2d', title: '2D 변환 행렬', description: '이동, 회전, 전단', status: 'soon' },
      { id: 'clipping', title: '클리핑 기술', description: 'Sutherland-Hodgman 알고리즘', status: 'soon' },
      { id: 'viewing3d', title: '3D 가시성', description: 'Z-Buffer 및 Back-face Culling', status: 'soon' }
    ]
  },
  {
    groupTitle: "03 사실적 렌더링 (1990s-00s)",
    items: [
      { id: 'shading', title: '로컬 조명 모델', description: 'Phong, Gouraud 모델', status: 'soon' },
      { id: 'projection', title: '투영의 수학', description: '직교 및 원근 투영', status: 'soon' },
      { id: 'texture', title: '텍스처 매핑', description: 'Mipmap 및 필터링', status: 'soon' }
    ]
  },
  {
    groupTitle: "04 현대 그래픽스 (2010s-Present)",
    items: [
      { id: 'pbr', title: 'PBR (물리 기반 렌더링)', description: '에너지 보존과 거칠기', status: 'soon' },
      { id: 'raytracing', title: '광선 추적법', description: 'Path Tracing 및 실시간 RT', status: 'soon' }
    ]
  }
]

// 파이프라인별 상세 구조 (Rendering Pipeline)
export const pipelineGroups: TopicGroup[] = [
  {
    groupTitle: "1. 데이터 전처리 (Application Stage)",
    items: [
      { id: 'vbo', title: '정점 버퍼 구성', description: '데이터의 GPU 전송', status: 'soon' },
      { id: 'scene-graph', title: '씬 그래프 관리', description: '계층적 객체 구조', status: 'soon' }
    ]
  },
  {
    groupTitle: "2. 기하 연산 (Geometry Stage)",
    items: [
      { id: 'v-shader', title: '정점 셰이더', description: 'MVP 변환 행렬 연산', status: 'soon' },
      { id: 'tessellation', title: '테셀레이션', description: '기하학적 디테일 추가', status: 'soon' },
      { id: 'projection', title: '투영 변환', description: 'Clip Space로의 전환', status: 'soon' }
    ]
  },
  {
    groupTitle: "3. 래스터화 (Rasterization Stage)",
    items: [
      {
        id: 'line',
        title: '도형 분해 (Scan Conversion)',
        description: '픽셀 프래그먼트 생성',
        status: 'ready',
        children: [
          { id: 'dda', title: 'DDA 스캔', status: 'ready' },
          { id: 'bresenham', title: 'Bresenham 스캔', status: 'ready' }
        ]
      },
      { id: 'interpolation', title: '속성 보간', description: 'Barycentric 좌표 연산', status: 'soon' }
    ]
  },
  {
    groupTitle: "4. 프래그먼트 처리 (Fragment Stage)",
    items: [
      { id: 'f-shader', title: '프래그먼트 셰이더', description: '픽셀당 조명 및 색상 연산', status: 'soon' },
      { id: 'testing', title: '출력 병합 (OM)', description: 'Z-Test, 스텐실, 블렌딩', status: 'soon' }
    ]
  }
]
