export const certCenters = [
  // 아라자전거길
  { id: 1, name: '아라서해갑문', lat: 37.5684, lng: 126.6087, route: '아라자전거길' },
  { id: 2, name: '아라한강갑문', lat: 37.5855, lng: 126.8041, route: '아라자전거길' },
  
  // 한강종주자전거길(서울)
  { id: 3, name: '여의도 서울마리나', lat: 37.5348, lng: 126.9329, route: '한강종주자전거길(서울)' },
  { id: 4, name: '뚝섬 전망콤플렉스', lat: 37.5284, lng: 127.0673, route: '한강종주자전거길(서울)' },
  { id: 5, name: '광나루 자전거공원', lat: 37.5458, lng: 127.1214, route: '한강종주자전거길(서울)' },
  
  // 남한강자전거길
  { id: 6, name: '능내역(폐역)', lat: 37.5303, lng: 127.2798, route: '남한강자전거길' },
  { id: 7, name: '양평군립미술관', lat: 37.4912, lng: 127.4879, route: '남한강자전거길' },
  { id: 8, name: '이포보', lat: 37.3917, lng: 127.5358, route: '남한강자전거길' },
  { id: 9, name: '여주보', lat: 37.3248, lng: 127.6046, route: '남한강자전거길' },
  { id: 10, name: '강천보', lat: 37.2718, lng: 127.6695, route: '남한강자전거길' },
  { id: 11, name: '비내섬', lat: 37.1472, lng: 127.8044, route: '남한강자전거길' },
  { id: 12, name: '충주댐', lat: 37.0006, lng: 127.9996, route: '남한강자전거길' },
  
  // 새재자전거길 (일부)
  { id: 13, name: '수안보온천', lat: 36.8455, lng: 127.9945, route: '새재자전거길' },
  { id: 14, name: '이화령휴게소', lat: 36.7645, lng: 128.0125, route: '새재자전거길' },
  { id: 15, name: '문경불정역', lat: 36.6347, lng: 128.1678, route: '새재자전거길' },
  
  // 북한강자전거길 (일부)
  { id: 16, name: '밝은광장', lat: 37.5482, lng: 127.3197, route: '북한강자전거길' },
  { id: 17, name: '샛터삼거리', lat: 37.6661, lng: 127.3541, route: '북한강자전거길' },
  { id: 18, name: '강촌역', lat: 37.8055, lng: 127.6339, route: '북한강자전거길' },
  { id: 19, name: '신매대교', lat: 37.9175, lng: 127.7121, route: '북한강자전거길' },
]

// 스탬프 이미지를 얻는 헬퍼 함수
export const getStampImageUrl = (center, isAcquired) => {
  // 실제 도장 이미지가 있다면 `/stamps/${center.id}.png` 형태로 불러올 수 있습니다.
  // 현재는 데이터가 없으므로 API를 활용해 센터 이름의 첫 글자로 임시 도장 이미지를 생성합니다.
  
  const text = encodeURIComponent(center.name.substring(0, 2))
  
  if (isAcquired) {
    // 획득 시: 유색 (예: 파란색 배경)
    return `https://ui-avatars.com/api/?name=${text}&background=0D8ABC&color=fff&rounded=true&size=64&font-size=0.4`
  } else {
    // 미획득 시: 회색 배경
    return `https://ui-avatars.com/api/?name=${text}&background=cccccc&color=666666&rounded=true&size=64&font-size=0.4`
  }
}
