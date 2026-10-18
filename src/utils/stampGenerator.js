/**
 * 국토종주 자전거 스탬프 SVG Data URI 생성기
 * 외부 이미지 서버 의존 없이 오프라인(PWA)에서도 100% 고화질 벡터 도장 그래픽을 렌더링합니다.
 */

// 인증센터별 고유 심볼/아이콘 매핑 (Step 1 심화 확장용)
export const centerCustomIcons = {
  // 아라/한강
  1: { icon: '🌊', label: '서해갑문' }, // 아라서해갑문
  2: { icon: '🚢', label: '한강갑문' }, // 아라한강갑문
  3: { icon: '⛵', label: '마리나' },   // 여의도
  4: { icon: '🗼', label: '전망대' },   // 뚝섬
  5: { icon: '🚲', label: '광나루' },   // 광나루
  6: { icon: '🚂', label: '간이역' },   // 능내역
  7: { icon: '🎨', label: '미술관' },   // 양평군립미술관
  // 남한강 보
  8: { icon: '🌾', label: '이포보' },   // 이포보
  9: { icon: '👑', label: '세종대왕' }, // 여주보
  10: { icon: '💧', label: '강천보' },  // 강천보
  11: { icon: '🦅', label: '비내섬' },  // 비내섬
  12: { icon: '🏞️', label: '충주댐' },  // 충주댐
  13: { icon: '🏯', label: '탄금대' },  // 충주탄금대
  // 북한강
  14: { icon: '✨', label: '밝은광장' }, // 밝은광장
  15: { icon: '🌿', label: '샛터' },    // 샛터삼거리
  16: { icon: '🌉', label: '경강교' },  // 경강교
  17: { icon: '🚴', label: '신매대교' }, // 신매대교
  // 새재
  18: { icon: '♨️', label: '온천' },    // 수안보온천
  19: { icon: '⛰️', label: '백두대간' },// 이화령휴게소
  20: { icon: '🚉', label: '불정역' },  // 문경 불정역
  21: { icon: '🌉', label: '상풍교' },  // 상주상풍교
  // 낙동강
  22: { icon: '🌅', label: '상주보' },  // 상주보
  23: { icon: '🌾', label: '낙단보' },  // 낙단보
  24: { icon: '🦆', label: '구미보' },  // 구미보
  25: { icon: '🕊️', label: '칠곡보' },  // 칠곡보
  26: { icon: '🌊', label: '안동댐' },  // 안동댐
  27: { icon: '🏛️', label: '디아크' },  // 강정고령보
  28: { icon: '🏞️', label: '달성보' },  // 달성보
  29: { icon: '🌿', label: '합천창녕' }, // 합천창녕보
  30: { icon: '🌊', label: '창녕함안' }, // 창녕함안보
  31: { icon: '💦', label: '물문화관' }, // 양산물문화관
  32: { icon: '⚓', label: '낙동하구' }, // 낙동강하굿둑
  // 금강
  33: { icon: '🕊️', label: '금강하구' }, // 금강하굿둑
  34: { icon: '⛵', label: '성당포구' }, // 익산성당포구
  35: { icon: '👑', label: '백제보' },  // 백제보
  36: { icon: '🏰', label: '공주보' },  // 공주보
  37: { icon: '🏛️', label: '세종보' },  // 세종보
  38: { icon: '🏞️', label: '대청댐' },  // 대청댐
  // 영산강
  39: { icon: '⚓', label: '영산하구' }, // 영산강하구둑
  40: { icon: '🔭', label: '느러지' },  // 느러지전망대
  41: { icon: '🌾', label: '죽산보' },  // 죽산보
  42: { icon: '🏞️', label: '승촌보' },  // 승촌보
  43: { icon: '🎋', label: '대나무숲' }, // 담양대나무숲
  44: { icon: '🌲', label: '메타세쿼' }, // 메타세쿼이아길
  45: { icon: '🏞️', label: '담양댐' }   // 담양댐
}

/**
 * 스탬프 SVG Data URL 생성 함수
 * @param {Object} center 인증센터 객체 ({ id, name, route })
 * @param {boolean} isAcquired 획득 여부
 * @returns {string} SVG data URI string
 */
export const generateStampSvg = (center, isAcquired, inkColor = '#1E5E4E') => {
  const shortName = center.name
    .replace(/인증센터|자전거길/g, '')
    .trim()
    .substring(0, 4)

  const meta = centerCustomIcons[center.id]
  const symbol = meta ? meta.icon : '🚴'

  if (isAcquired) {
    // 획득 도장: 쿨톤 뮤트 초록색, 이중 원형 테두리, 상징 이모지/심볼, 인증 문구
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
      <!-- 외곽 도장 프레임 -->
      <circle cx="45" cy="45" r="41" fill="%23FFFFFF" stroke="${encodeURIComponent(inkColor)}" stroke-width="3.2" />
      <circle cx="45" cy="45" r="36.5" fill="none" stroke="${encodeURIComponent(inkColor)}" stroke-width="1.2" stroke-dasharray="3,1.5" />
      
      <!-- 상단 리본/텍스트 (크기 확대: 8 -> 9.5) -->
      <text x="45" y="24" font-size="9.5" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="800" fill="${encodeURIComponent(inkColor)}" text-anchor="middle" letter-spacing="1">국토종주</text>
      
      <!-- 중앙 심볼 아이콘 (크기 확대: 16 -> 18) -->
      <text x="45" y="44" font-size="18" text-anchor="middle">${symbol}</text>
      
      <!-- 인증센터 명칭 (크기 확대: 11 -> 13, 초강조) -->
      <text x="45" y="60" font-size="13" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="900" fill="${encodeURIComponent(inkColor)}" text-anchor="middle">${encodeURIComponent(shortName)}</text>
      
      <!-- 하단 인증 완료 표식 (크기 확대: 8 -> 9.5) -->
      <text x="45" y="74" font-size="9.5" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="800" fill="${encodeURIComponent(inkColor)}" text-anchor="middle" letter-spacing="1.5">★인증★</text>
    </svg>`
  } else {
    // 미획득 도장: 모노톤 회색 점선 원형 테두리, 반투명 배경
    const grayColor = '#888888'
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r="41" fill="rgba(245,245,247,0.9)" stroke="${encodeURIComponent(grayColor)}" stroke-width="2" stroke-dasharray="4,3" />
      <circle cx="45" cy="45" r="36.5" fill="none" stroke="%23D1D5DB" stroke-width="1" />
      
      <text x="45" y="25" font-size="9" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="600" fill="%239CA3AF" text-anchor="middle">미인증</text>
      <text x="45" y="44" font-size="16" text-anchor="middle" opacity="0.45">${symbol}</text>
      <text x="45" y="61" font-size="12" font-family="'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif" font-weight="800" fill="${encodeURIComponent(grayColor)}" text-anchor="middle">${encodeURIComponent(shortName)}</text>
      <circle cx="45" cy="72" r="2.5" fill="%23CBD5E1" />
    </svg>`
  }
}
