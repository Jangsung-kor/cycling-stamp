/**
 * 국토종주 자전거 스탬프 & GPX 완주 인증 포토 카드 캔버스 렌더러
 * 100% 브라우저 클라이언트 사이드 렌더링 (서버 부하/비용 0원, 완벽한 오프라인 동작)
 */

export const CARD_DIMENSIONS = {
  story: { width: 1080, height: 1920, label: '9:16 스토리' },
  square: { width: 1080, height: 1080, label: '1:1 피드' }
}

export const SIMPLE_SUB_COLORS = {
  black: {
    id: 'black',
    name: '블랙',
    bgStart: '#0f172a',
    bgEnd: '#020617',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    textMain: '#ffffff',
    textSub: '#94a3b8',
    trackDefaultColor: '#38bdf8'
  },
  navy: {
    id: 'navy',
    name: '네이비',
    bgStart: '#0f1d38',
    bgEnd: '#080d1a',
    cardBorder: 'rgba(147, 197, 253, 0.18)',
    badgeBg: 'rgba(147, 197, 253, 0.08)',
    textMain: '#ffffff',
    textSub: '#93c5fd',
    trackDefaultColor: '#60a5fa'
  }
}

export const CARD_THEMES = {
  dark: {
    id: 'dark',
    name: '심플',
    bgStart: '#0f172a',
    bgEnd: '#020617',
    textMain: '#ffffff',
    textSub: '#94a3b8',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    badgeBg: 'rgba(255, 255, 255, 0.08)',
    statBg: 'rgba(15, 23, 42, 0.65)',
    trackDefaultColor: '#38bdf8'
  },
  ink: {
    id: 'ink',
    name: '아날로그 수첩',
    bgStart: '#fbf9f4',
    bgEnd: '#e6d8c3',
    textMain: '#2c221e',
    textSub: '#7c6e65',
    cardBorder: 'rgba(184, 74, 72, 0.28)',
    badgeBg: 'rgba(184, 74, 72, 0.08)',
    statBg: 'rgba(255, 252, 248, 0.92)',
    trackDefaultColor: '#b84a48',
    outerBorder: 'rgba(184, 74, 72, 0.35)',
    innerBorder: 'rgba(184, 74, 72, 0.18)',
    gridColor: 'rgba(124, 110, 101, 0.04)',
    sealColor: 'rgba(184, 74, 72, 0.09)'
  },
  photo: {
    id: 'photo',
    name: '내 사진 배경',
    bgStart: '#000000',
    bgEnd: '#000000',
    textMain: '#ffffff',
    textSub: 'rgba(255, 255, 255, 0.8)',
    cardBorder: 'rgba(255, 255, 255, 0.15)',
    badgeBg: 'rgba(0, 0, 0, 0.4)',
    statBg: 'rgba(0, 0, 0, 0.55)',
    trackDefaultColor: '#22c55e'
  }
}

/**
 * 위경도 좌표 목록의 바운딩 박스 및 유효성 산출
 */
export function computeTrackBounds(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return null
  }

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const pt of coordinates) {
    const lat = typeof pt.lat === 'number' ? pt.lat : parseFloat(pt.lat)
    const lng = typeof pt.lng === 'number' ? pt.lng : parseFloat(pt.lng)
    if (isNaN(lat) || isNaN(lng)) continue

    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
  }

  if (minLat === Infinity || minLng === Infinity) {
    return null
  }

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    deltaLat: Math.max(maxLat - minLat, 0.0001),
    deltaLng: Math.max(maxLng - minLng, 0.0001),
    midLat: (minLat + maxLat) / 2
  }
}

/**
 * GPX 위경도 좌표를 캔버스 사각 영역(rect)에 종횡비 보존(Mercator) 투영
 * @param {Array} coordinates [{ lat, lng }]
 * @param {Object} rect { x, y, width, height, padding }
 * @returns {Array} [{ x, y }]
 */
export function projectCoordinatesToCanvas(coordinates, rect) {
  const bounds = computeTrackBounds(coordinates)
  if (!bounds) return []

  const pad = rect.padding || 30
  const drawW = rect.width - pad * 2
  const drawH = rect.height - pad * 2

  // 위도에 따른 경도 왜곡 보정 (Mercator Cosine)
  const cosMidLat = Math.cos((bounds.midLat * Math.PI) / 180)
  const realWidthDist = bounds.deltaLng * cosMidLat
  const realHeightDist = bounds.deltaLat

  // 가로/세로 비율에 맞춰 fit (Letterbox/Pillarbox)
  const scale = Math.min(drawW / realWidthDist, drawH / realHeightDist)
  const fittedW = realWidthDist * scale
  const fittedH = realHeightDist * scale

  // 영역 중앙 정렬 오프셋
  const offsetX = rect.x + pad + (drawW - fittedW) / 2
  const offsetY = rect.y + pad + (drawH - fittedH) / 2

  return coordinates.map(pt => {
    const lat = typeof pt.lat === 'number' ? pt.lat : parseFloat(pt.lat)
    const lng = typeof pt.lng === 'number' ? pt.lng : parseFloat(pt.lng)

    // X: 경도 비례 (좌 -> 우)
    const normX = ((lng - bounds.minLng) * cosMidLat) * scale
    // Y: 위도 비례 (상 -> 하, 위도가 높을수록 Y는 작음)
    const normY = ((bounds.maxLat - lat)) * scale

    return {
      x: Math.round(offsetX + normX),
      y: Math.round(offsetY + normY)
    }
  })
}

/**
 * 소요 시간 포맷터 (분 -> H시간 M분)
 */
export function formatCardDuration(minutes) {
  if (!minutes || minutes <= 0) return '0분'
  const m = Math.round(minutes)
  const hrs = Math.floor(m / 60)
  const mins = m % 60
  if (hrs > 0 && mins > 0) return `${hrs}시간 ${mins}분`
  if (hrs > 0) return `${hrs}시간`
  return `${mins}분`
}

/**
 * 날짜 포맷터 (YYYY.MM.DD)
 */
export function formatCardDate(isoStringOrTimestamp) {
  if (!isoStringOrTimestamp) {
    const now = new Date()
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  }
  const date = new Date(isoStringOrTimestamp)
  if (isNaN(date.getTime())) {
    const now = new Date()
    return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`
  }
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}

/**
 * 이미지 객체를 Cover 모드로 캔버스에 그리기
 */
function drawImageCover(ctx, img, x, y, w, h) {
  const imgW = img.naturalWidth || img.width
  const imgH = img.naturalHeight || img.height
  const imgRatio = imgW / imgH
  const targetRatio = w / h

  let sW, sH, sX, sY
  if (imgRatio > targetRatio) {
    sH = imgH
    sW = imgH * targetRatio
    sX = (imgW - sW) / 2
    sY = 0
  } else {
    sW = imgW
    sH = imgW / targetRatio
    sX = 0
    sY = (imgH - sH) / 2
  }

  ctx.drawImage(img, sX, sY, sW, sH, x, y, w, h)
}

/**
 * 아날로그 수첩 테마 전용: 여권 종이 질감 & 비네팅 렌더링
 */
function drawInkPaperBackground(ctx, width, height, themeCfg) {
  // 1. 방사형 웜톤 비네팅 그라디언트 (중앙 밝은 한지 크림 -> 외곽 오래된 수첩 음영)
  const radialGrad = ctx.createRadialGradient(
    width / 2,
    height * 0.42,
    width * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  )
  radialGrad.addColorStop(0, '#fdfbf7')
  radialGrad.addColorStop(0.5, '#f5ebe0')
  radialGrad.addColorStop(1, '#e3d4be')

  ctx.fillStyle = radialGrad
  ctx.fillRect(0, 0, width, height)

  // 2. 클래식 여권 모눈 그리드 텍스처 (미세하고 정갈한 격자)
  ctx.save()
  ctx.strokeStyle = themeCfg.gridColor || 'rgba(124, 110, 101, 0.04)'
  ctx.lineWidth = 1
  const step = 40
  ctx.beginPath()
  for (let x = step; x < width; x += step) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (let y = step; y < height; y += step) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()
  ctx.restore()
}

/**
 * 아날로그 수첩 테마 전용: 공식 여권 이중 테두리 & 모서리 장식 브래킷
 */
function drawPassportDoubleBorder(ctx, width, height, themeCfg) {
  ctx.save()
  const outerMargin = 38
  const innerMargin = 48
  const outerW = width - outerMargin * 2
  const outerH = height - outerMargin * 2
  const innerW = width - innerMargin * 2
  const innerH = height - innerMargin * 2

  // 1. 외곽 굵은 프레임 (인주빛 앤틱 브라운)
  ctx.strokeStyle = themeCfg.outerBorder || 'rgba(184, 74, 72, 0.35)'
  ctx.lineWidth = 2.5
  ctx.strokeRect(outerMargin, outerMargin, outerW, outerH)

  // 2. 내측 미세 테두리선
  ctx.strokeStyle = themeCfg.innerBorder || 'rgba(184, 74, 72, 0.18)'
  ctx.lineWidth = 1
  ctx.strokeRect(innerMargin, innerMargin, innerW, innerH)

  // 3. 4개 모서리 클래식 브래킷(L자 코너) 장식
  const cornerLen = 22
  const cornerPad = 58
  ctx.strokeStyle = themeCfg.outerBorder || 'rgba(184, 74, 72, 0.4)'
  ctx.lineWidth = 2

  ctx.beginPath()
  // 좌상단
  ctx.moveTo(cornerPad, cornerPad + cornerLen)
  ctx.lineTo(cornerPad, cornerPad)
  ctx.lineTo(cornerPad + cornerLen, cornerPad)

  // 우상단
  ctx.moveTo(width - cornerPad - cornerLen, cornerPad)
  ctx.lineTo(width - cornerPad, cornerPad)
  ctx.lineTo(width - cornerPad, cornerPad + cornerLen)

  // 좌하단
  ctx.moveTo(cornerPad, height - cornerPad - cornerLen)
  ctx.lineTo(cornerPad, height - cornerPad)
  ctx.lineTo(cornerPad + cornerLen, height - cornerPad)

  // 우하단
  ctx.moveTo(width - cornerPad - cornerLen, height - cornerPad)
  ctx.lineTo(width - cornerPad, height - cornerPad)
  ctx.lineTo(width - cornerPad, height - cornerPad - cornerLen)
  ctx.stroke()

  ctx.restore()
}

/**
 * 아날로그 수첩 테마 전용: 공식 인증 원형 인주 날인 씰 워터마크
 */
function drawOfficialSealWatermark(ctx, cx, cy, radius) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((-12 * Math.PI) / 180) // 수작업 스탬프 특유의 자연스러운 틸트

  const sealColor = 'rgba(184, 74, 72, 0.08)'
  ctx.strokeStyle = sealColor
  ctx.fillStyle = sealColor

  // 외곽 이중 원
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, radius - 12, 0, Math.PI * 2)
  ctx.stroke()

  // 내부 점선 링
  ctx.save()
  ctx.setLineDash([4, 6])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, radius - 24, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // 중앙 텍스트 엠블럼
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 24px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillText('국토종주 완주 인증', 0, -28)

  ctx.font = '800 18px "Pretendard", sans-serif'
  ctx.fillText('OFFICIAL SEAL', 0, 0)

  ctx.font = '700 15px "Pretendard", sans-serif'
  ctx.fillText('KOREA CYCLING PATHS', 0, 26)

  ctx.restore()
}

/**
 * 브라우저 캔버스에 고해상도 인증 카드 렌더링
 * @param {HTMLCanvasElement} canvas
 * @param {Object} options
 */
export async function renderCertificationCard(canvas, options = {}) {
  const {
    aspectRatio = 'story',
    theme = 'dark',
    simpleColor = 'black',
    trackTitle = '국토종주 라이딩',
    courseName = '',
    distanceKm = 0,
    elevationGainM = 0,
    durationMinutes = 0,
    date = null,
    coordinates = [],
    stampImages = [], // Array of HTMLImageElement or data URIs
    userPhotoImg = null, // HTMLImageElement
    riderName = '라이더',
    userCode = '',
    accentColor = null
  } = options

  const dim = CARD_DIMENSIONS[aspectRatio] || CARD_DIMENSIONS.story
  let themeCfg = CARD_THEMES[theme] || CARD_THEMES.dark
  if (theme === 'dark' && SIMPLE_SUB_COLORS[simpleColor]) {
    themeCfg = { ...themeCfg, ...SIMPLE_SUB_COLORS[simpleColor] }
  }
  const mainAccent = accentColor || themeCfg.trackDefaultColor

  canvas.width = dim.width
  canvas.height = dim.height
  const ctx = canvas.getContext('2d')

  // 1. 배경 렌더링
  if (theme === 'photo' && userPhotoImg) {
    drawImageCover(ctx, userPhotoImg, 0, 0, dim.width, dim.height)
    // 딤 및 비네팅 그라디언트 오버레이 (텍스트/궤적 가독성 확보)
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, dim.height)
    overlayGrad.addColorStop(0, 'rgba(0, 0, 0, 0.75)')
    overlayGrad.addColorStop(0.3, 'rgba(0, 0, 0, 0.35)')
    overlayGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)')
    overlayGrad.addColorStop(1, 'rgba(0, 0, 0, 0.92)')
    ctx.fillStyle = overlayGrad
    ctx.fillRect(0, 0, dim.width, dim.height)
  } else if (theme === 'ink') {
    // 아날로그 수첩: 여권 종이 질감 & 웜톤 비네팅
    drawInkPaperBackground(ctx, dim.width, dim.height, themeCfg)
  } else {
    // 다크 그라디언트 배경 (심플 블랙 / 네이비)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, dim.height)
    bgGrad.addColorStop(0, themeCfg.bgStart)
    bgGrad.addColorStop(1, themeCfg.bgEnd)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, dim.width, dim.height)
  }

  // 2. 외곽 프레임 테두리
  if (theme === 'ink') {
    // 공식 여권 이중 테두리 & 앤틱 코너 브래킷
    drawPassportDoubleBorder(ctx, dim.width, dim.height, themeCfg)
  } else if (theme === 'dark') {
    // 심플 테마: 1px 미니멀 헤어라인 정밀 프레임
    ctx.strokeStyle = themeCfg.cardBorder
    ctx.lineWidth = 1
    ctx.strokeRect(40, 40, dim.width - 80, dim.height - 80)
  } else {
    ctx.strokeStyle = themeCfg.cardBorder
    ctx.lineWidth = 2
    ctx.strokeRect(40, 40, dim.width - 80, dim.height - 80)
  }

  // 3. 헤더 영역 (로고 & 서브타이틀)
  const headerY = 120
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  // CYCLING STAMP 로고
  ctx.font = '800 36px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = themeCfg.textMain
  ctx.fillText('CYCLING STAMP', 80, headerY)

  // CERTIFIED RIDE 뱃지 / 인증 라벨
  const badgeText = courseName ? 'OFFICIAL COURSE CERTIFICATE' : 'VERIFIED RIDE'
  ctx.font = '700 20px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = mainAccent
  ctx.fillText(badgeText, 80, headerY + 48)

  // 우측 상단 날짜
  ctx.textAlign = 'right'
  ctx.font = '500 26px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = themeCfg.textSub
  ctx.fillText(formatCardDate(date), dim.width - 80, headerY + 10)

  // 헤더 구분선
  ctx.strokeStyle = themeCfg.cardBorder
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(80, headerY + 95)
  ctx.lineTo(dim.width - 80, headerY + 95)
  ctx.stroke()

  // 4. 주행 제목 (Title)
  const titleY = headerY + 130
  ctx.textAlign = 'left'
  ctx.font = '900 54px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = themeCfg.textMain
  
  // 제목 줄임 처리 (최대 폭 제한)
  const maxTitleW = dim.width - 160
  let displayTitle = courseName || trackTitle || '국토종주 라이딩'
  if (ctx.measureText(displayTitle).width > maxTitleW) {
    while (displayTitle.length > 4 && ctx.measureText(displayTitle + '...').width > maxTitleW) {
      displayTitle = displayTitle.slice(0, -1)
    }
    displayTitle += '...'
  }
  ctx.fillText(displayTitle, 80, titleY)

  // 5. 비주얼 영역 (GPX 궤적 & 도장 합성)
  // 레이아웃 좌표 계산
  let visualRect, statsY
  if (aspectRatio === 'story') {
    visualRect = { x: 80, y: titleY + 90, width: dim.width - 160, height: 780, padding: 40 }
    statsY = visualRect.y + visualRect.height + 60
  } else {
    // 1:1 피드
    visualRect = { x: 80, y: titleY + 80, width: dim.width - 160, height: 420, padding: 30 }
    statsY = visualRect.y + visualRect.height + 40
  }

  // 5-0. 아날로그 수첩 테마: 배경 공식 인증 원형 씰 워터마크 날인
  if (theme === 'ink') {
    const sealCx = visualRect.x + visualRect.width * 0.5
    const sealCy = visualRect.y + visualRect.height * 0.48
    const sealR = Math.min(visualRect.width, visualRect.height) * 0.36
    drawOfficialSealWatermark(ctx, sealCx, sealCy, sealR)
  }

  // 5-1. GPX 궤적 렌더링
  if (coordinates && coordinates.length > 1) {
    const pts = projectCoordinatesToCanvas(coordinates, visualRect)

    if (pts.length > 1) {
      if (theme === 'ink') {
        // 인주 잉크 번짐 효과 (2-pass stroke: 스밈 외곽선 + 선명한 코어 잉크선)
        ctx.save()
        ctx.strokeStyle = 'rgba(184, 74, 72, 0.20)'
        ctx.lineWidth = 12
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y)
        }
        ctx.stroke()
        ctx.restore()

        ctx.save()
        ctx.strokeStyle = mainAccent
        ctx.lineWidth = 5
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y)
        }
        ctx.stroke()
        ctx.restore()
      } else {
        // 기존 다크 / 포토 궤적 렌더링
        ctx.save()
        ctx.shadowColor = mainAccent
        ctx.shadowBlur = 20
        ctx.strokeStyle = mainAccent
        ctx.lineWidth = 6
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y)
        }
        ctx.stroke()
        ctx.restore()
      }

      // 시작점 및 도착점 핀 포인트
      ctx.save()
      ctx.shadowBlur = 0
      // 출발점: 앰버/화이트
      ctx.fillStyle = theme === 'ink' ? '#fdfbf7' : '#ffffff'
      ctx.beginPath()
      ctx.arc(pts[0].x, pts[0].y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = mainAccent
      ctx.lineWidth = 3
      ctx.stroke()

      // 도착점: 테마 강조색
      ctx.fillStyle = mainAccent
      ctx.beginPath()
      ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = theme === 'ink' ? '#fdfbf7' : '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.restore()
    }
  }

  // 5-2. 스탬프 도장 합성 (우측 상단 또는 하단에 아날로그 틸트로 쿵 찍힌 효과)
  if (stampImages && stampImages.length > 0) {
    ctx.save()
    // 도장 1~2개 배치
    const stampSize = aspectRatio === 'story' ? 220 : 160
    const stampX = dim.width - 120 - stampSize
    const stampY = visualRect.y + (aspectRatio === 'story' ? 30 : 10)

    // 아날로그 수작업 도장 느낌의 틸트 (-5도 회전)
    ctx.translate(stampX + stampSize / 2, stampY + stampSize / 2)
    ctx.rotate((-5 * Math.PI) / 180)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 4

    const firstStamp = stampImages[0]
    if (firstStamp) {
      ctx.drawImage(firstStamp, -stampSize / 2, -stampSize / 2, stampSize, stampSize)
    }
    ctx.restore()
  }

  // 6. 주행 통계 정보 그리드 (3열 카드)
  const statBoxW = (dim.width - 160 - 40) / 3
  const statBoxH = aspectRatio === 'story' ? 170 : 130
  const stats = [
    { label: '주행 거리', value: `${distanceKm || 0}`, unit: 'km' },
    { label: '획득 고도', value: `${elevationGainM || 0}`, unit: 'm' },
    { label: '소요 시간', value: formatCardDuration(durationMinutes), unit: '' }
  ]

  stats.forEach((st, idx) => {
    const boxX = 80 + idx * (statBoxW + 20)
    
    // 통계 박스 배경
    if (theme === 'ink') {
      ctx.save()
      ctx.fillStyle = themeCfg.statBg
      ctx.strokeStyle = 'rgba(184, 74, 72, 0.22)'
      ctx.lineWidth = 1.5
      ctx.shadowColor = 'rgba(124, 110, 101, 0.08)'
      ctx.shadowBlur = 10
      ctx.shadowOffsetY = 3
      roundRect(ctx, boxX, statsY, statBoxW, statBoxH, 14)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    } else if (theme === 'dark') {
      // 심플 테마: 묵직한 불투명 면 채우기를 덜어내고 슬림 1px 라인으로 정갈한 여백 유지
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'
      ctx.strokeStyle = themeCfg.cardBorder
      ctx.lineWidth = 1
      roundRect(ctx, boxX, statsY, statBoxW, statBoxH, 12)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    } else {
      ctx.fillStyle = themeCfg.statBg
      ctx.strokeStyle = themeCfg.cardBorder
      ctx.lineWidth = 1.5
      roundRect(ctx, boxX, statsY, statBoxW, statBoxH, 16)
      ctx.fill()
      ctx.stroke()
    }

    // 라벨
    ctx.textAlign = 'center'
    ctx.font = '600 22px "Apple SD Gothic Neo", "Pretendard", sans-serif'
    ctx.fillStyle = themeCfg.textSub
    ctx.fillText(st.label, boxX + statBoxW / 2, statsY + (aspectRatio === 'story' ? 32 : 22))

    // 수치 & 단위
    ctx.font = '800 42px "Pretendard", "Apple SD Gothic Neo", sans-serif'
    ctx.fillStyle = themeCfg.textMain
    const valText = st.value
    const valY = statsY + (aspectRatio === 'story' ? 82 : 62)
    
    if (st.unit) {
      const fullW = ctx.measureText(valText).width
      ctx.fillText(valText, boxX + statBoxW / 2 - 14, valY)
      ctx.font = '600 24px "Apple SD Gothic Neo", sans-serif'
      ctx.fillStyle = mainAccent
      ctx.fillText(st.unit, boxX + statBoxW / 2 + (fullW / 2), valY + 12)
    } else {
      ctx.font = '800 36px "Apple SD Gothic Neo", "Pretendard", sans-serif'
      ctx.fillText(valText, boxX + statBoxW / 2, valY)
    }
  })

  // 7. 하단 푸터 (라이더 정보 & 커뮤니티 바이럴 워터마크)
  const footerY = dim.height - (aspectRatio === 'story' ? 170 : 130)

  // 구분선
  ctx.strokeStyle = themeCfg.cardBorder
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(80, footerY - 30)
  ctx.lineTo(dim.width - 80, footerY - 30)
  ctx.stroke()

  // 좌측: 라이더 닉네임 & 고유 친구 코드
  ctx.textAlign = 'left'
  ctx.font = '700 32px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = themeCfg.textMain
  ctx.fillText(riderName || '라이더', 80, footerY)

  if (userCode) {
    ctx.font = '600 22px "Pretendard", monospace'
    ctx.fillStyle = mainAccent
    ctx.fillText(`FRIEND CODE: ${userCode}`, 80, footerY + 42)
  }

  // 우측: 서비스 도메인 워터마크 (바이럴 유입 핵심)
  ctx.textAlign = 'right'
  ctx.font = '700 24px "Apple SD Gothic Neo", "Pretendard", sans-serif'
  ctx.fillStyle = themeCfg.textSub
  ctx.fillText('자전거 국토종주 스탬프 & GPX', dim.width - 80, footerY)

  ctx.font = '800 26px "Pretendard", sans-serif'
  ctx.fillStyle = mainAccent
  ctx.fillText('cycling-stamp.web.app', dim.width - 80, footerY + 36)

  return canvas
}

/**
 * 둥근 사각형 경로 헬퍼
 */
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * 캔버스 이미지를 PNG Blob 또는 파일로 변환
 */
export function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob)
    }, 'image/png', 0.95)
  })
}

/**
 * 이미지 로드 헬퍼 (Data URI 또는 이미지 URL -> HTMLImageElement)
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}
