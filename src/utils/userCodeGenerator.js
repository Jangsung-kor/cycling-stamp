/**
 * 사용자 친구 고유 코드(User Code) 유틸리티
 * - 이메일 등 개인정보를 노출하지 않고 안전하게 친구를 찾고 맺기 위한 고유 식별 태그
 * - 예: CY-7K8P (가독성 높은 32개 영숫자 조합)
 */

// 혼동하기 쉬운 문자(0, O, 1, I, L)를 제외한 안전한 문자셋
const SAFE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * 고유 친구 코드 생성 (기본 포맷: CY-XXXX)
 * @param {number} length 문자열 길이 (기본 4글자, CY- 제외)
 * @returns {string} 예: 'CY-7K8P'
 */
export function generateUserCode(length = 4) {
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * SAFE_CHARS.length)
    result += SAFE_CHARS[randomIndex]
  }
  return `CY-${result}`
}

/**
 * 사용자 입력 코드 정규화 (대소문자 무시, 공백/# 기호 제거, CY- 접두사 보정)
 * @param {string} rawInput 
 * @returns {string} 정규화된 코드 (예: 'cy7k8p' -> 'CY-7K8P', '#CY-7K8P' -> 'CY-7K8P')
 */
export function normalizeUserCode(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return ''
  
  // 공백 및 특수문자(#, -) 제거 후 대문자화
  let cleaned = rawInput.trim().toUpperCase().replace(/[#\s-]/g, '')
  
  // CY 접두사가 앞에 있다면 분리
  if (cleaned.startsWith('CY')) {
    cleaned = cleaned.substring(2)
  }
  
  if (cleaned.length === 0) return ''
  return `CY-${cleaned}`
}

/**
 * 친구 코드 형식 유효성 검사
 * @param {string} code 
 * @returns {boolean}
 */
export function validateUserCode(code) {
  if (!code || typeof code !== 'string') return false
  const normalized = normalizeUserCode(code)
  // CY- 뒤에 4글자 이상 8글자 이하의 영숫자
  const regex = /^CY-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4,8}$/
  return regex.test(normalized)
}
