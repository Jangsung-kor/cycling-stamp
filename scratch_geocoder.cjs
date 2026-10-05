const fs = require('fs');
const https = require('https');

const rawCenters = [
  { id: 1, name: '아라서해갑문', address: '인천광역시 서구 정서진1로 41', route: '아라자전거길', lat: 37.558421, lng: 126.607473 },
  { id: 2, name: '아라한강갑문', address: '서울특별시 강서구 개화동 아라한강갑문인증센터', route: '아라자전거길', lat: 37.598771, lng: 126.800364 },
  { id: 3, name: '여의도 인증센터', address: '서울특별시 영등포구 여의도동 81-8', route: '한강종주자전거길(서울)' },
  { id: 4, name: '뚝섬전망콤플렉스 인증센터', address: '서울 광진구 자양동 145-4', route: '한강종주자전거길(서울)' },
  { id: 5, name: '광나루자전거공원인증센터', address: '서울 강동구 한강남자전거길 3646', route: '한강종주자전거길(서울)' },
  { id: 6, name: '능내역인증센터', address: '경기 남양주시 조안면 능내리 229', route: '남한강자전거길' },
  { id: 7, name: '앙평군립미술관인증센터', address: '경기 양평군 양평읍 남한강자전거길 2899 양평자전거길 쉼터', route: '남한강자전거길' },
  { id: 8, name: '이포보인증센터', address: '경기 여주시 대신면 여양로 1933', route: '남한강자전거길' },
  { id: 9, name: '여주보인증센터', address: '경기 여주시 세종대왕면 왕대리 356-10', route: '남한강자전거길' },
  { id: 10, name: '강천보인증센터', address: '경기 여주시 신단1길 83', route: '남한강자전거길' },
  { id: 11, name: '비내섬인증센터', address: '충북 충주시 앙성면 남한강변길 146', route: '남한강자전거길' },
  { id: 12, name: '충주댐인증센터', address: '충북 충주시 종민동 1072-1', route: '남한강자전거길' },
  { id: 13, name: '충주탄금대인증센터', address: '충북 충주시 칠금동 산1-29', route: '남한강자전거길' },
  { id: 14, name: '밝은광장인증센터', address: '경기 남양주시 조안면 북한강로 366-20', route: '북한강자전거길' },
  { id: 15, name: '샛터삼거리인증센터', address: '경기 남양주시 화도읍 구암리 66-2', route: '북한강자전거길' },
  { id: 16, name: '경강교인증센터', address: '경기 가평군 가평읍 대곡리 31-2', route: '북한강자전거길' },
  { id: 17, name: '신매대교인증센터', address: '강원 춘천시 서면 신매리 40-4', route: '북한강자전거길' },
  { id: 18, name: '수안보온천인증센터', address: '충북 충주시 수안보면 온천리 297-3', route: '새재자전거길' },
  { id: 19, name: '이화령휴게소인증센터', address: '충북 괴산군 연풍면 이화령로 561', route: '새재자전거길' },
  { id: 20, name: '문경 불정역 자전거길 인증센터', address: '경북 문경시 불정강변길 187', route: '새재자전거길' },
  { id: 21, name: '상주상풍교인증센터', address: '경북 상주시 사벌국면 매호리 산31-3', route: '새재자전거길' },
  { id: 22, name: '상주보인증센터', address: '경북 상주시 중동면 오상리 776-5', route: '낙동강종주자전거길' },
  { id: 23, name: '낙단보인증센터', address: '경북 의성군 단밀면 생송리 산172-1', route: '낙동강종주자전거길' },
  { id: 24, name: '구미보 자전거길 인증센터', address: '경북 구미시 해평면 낙동강자전거길 25651 구미보명품화장실', route: '낙동강종주자전거길' },
  { id: 25, name: '칠곡보인증센터', address: '경북 칠곡군 석적읍 중지리 559-1', route: '낙동강종주자전거길' },
  { id: 26, name: '안동댐인증센터', address: '경북 안동시 석주로 202', route: '낙동강종주자전거길' },
  { id: 27, name: '강정고령보인증센터', address: '대구 달성군 다사읍 강정본길 57', route: '낙동강종주자전거길' },
  { id: 28, name: '달성보 인증센터', address: '대구 달성군 논공읍 비슬로 1193', route: '낙동강종주자전거길' },
  { id: 29, name: '합천창녕보인증센터', address: '경남 창녕군 이방면 죽전등림길 154', route: '낙동강종주자전거길' },
  { id: 30, name: '창녕함안보인증센터', address: '경남 함안군 칠북면 봉촌2길 427', route: '낙동강종주자전거길' },
  { id: 31, name: '양산물문화관인증센터', address: '경남 양산시 물금읍 물금리 863-1', route: '낙동강종주자전거길' },
  { id: 32, name: '낙동강하굿둑인증센터', address: '부산 사하구 낙동남로233번길 1', route: '낙동강종주자전거길' },
  { id: 33, name: '금강하굿둑인증센터', address: '전북 군산시 성산면 철새로 120', route: '금강종주자전거길' },
  { id: 34, name: '익산성당포구인증센터', address: '전북 익산시 성당면 성당리 287-7', route: '금강종주자전거길' },
  { id: 35, name: '백제보인증센터', address: '충남 부여군 부여읍 북포로 451', route: '금강종주자전거길' },
  { id: 36, name: '공주보인증센터', address: '충남 공주시 웅진동 726', route: '금강종주자전거길' },
  { id: 37, name: '세종보인증센터', address: '세종 나리로 82 세종보관리사무소', route: '금강종주자전거길' },
  { id: 38, name: '대청댐인증센터', address: '대전 대덕구 대청로 636 상점', route: '금강종주자전거길' },
  { id: 39, name: '영산강하구둑인증센터', address: '전남 목포시 남악로58번길 20', route: '영산강종주자전거길' }, // removed 광주
  { id: 40, name: '느러지전망관람대', address: '전남 나주시 동강면 동강로 307-194', route: '영산강종주자전거길' },
  { id: 41, name: '죽산보인증센터', address: '전남 나주시 다시면', route: '영산강종주자전거길' },
  { id: 42, name: '승촌보인증센터', address: '광주 남구 승촌보길 90', route: '영산강종주자전거길' },
  { id: 43, name: '담양대나무숲인증센터', address: '광주 북구 용전동 566', route: '영산강종주자전거길' },
  { id: 44, name: '메타세쿼이아길인증센터', address: '전남 담양군 담양읍 메타세쿼이아로 177', route: '영산강종주자전거길' },
  { id: 45, name: '담양댐인증센터', address: '전남 담양군 금성면 대성리 1049', route: '영산강종주자전거길' }
];

const apiKey = 'KakaoAK 52a76eb060cfe58c3e0117e4976e11e5';

function fetchCoords(query, isKeyword) {
  return new Promise((resolve, reject) => {
    const type = isKeyword ? 'keyword' : 'address';
    const url = `https://dapi.kakao.com/v2/local/search/${type}.json?query=${encodeURIComponent(query)}`;
    const options = {
      headers: {
        'Authorization': apiKey,
        'KA': 'sdk/1.0.0 os/javascript lang/ko-KR origin/https%3A%2F%2Fcycling-stamp.web.app'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.documents && parsed.documents.length > 0) {
            resolve({
              lat: parseFloat(parsed.documents[0].y),
              lng: parseFloat(parsed.documents[0].x)
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function run() {
  const result = [];
  for (let i = 0; i < rawCenters.length; i++) {
    let center = rawCenters[i];
    if (center.lat && center.lng) {
      result.push(center);
      continue;
    }
    
    // 1. Try address search
    let coords = await fetchCoords(center.address, false);
    if (!coords) {
      // 2. Try keyword search with name + address snippet
      coords = await fetchCoords(center.name, true);
    }
    
    if (coords) {
      console.log(`Found: ${center.name}`);
      center.lat = coords.lat;
      center.lng = coords.lng;
    } else {
      console.log(`Failed: ${center.name} - using placeholder`);
      // default placeholder (just to not crash)
      center.lat = 37.5; center.lng = 127.0;
    }
    result.push(center);
  }
  
  // Create output JS file content
  let jsContent = "export const certCenters = [\n";
  result.forEach(r => {
    jsContent += `  { id: ${r.id}, name: '${r.name}', lat: ${r.lat.toFixed(6)}, lng: ${r.lng.toFixed(6)}, route: '${r.route}' },\n`;
  });
  
  jsContent += `];

export const getStampImageUrl = (center, isAcquired) => {
  const text = encodeURIComponent(center.name.substring(0, 2));
  if (isAcquired) {
    return \`https://ui-avatars.com/api/?name=\${text}&background=0D8ABC&color=fff&rounded=true&size=64&font-size=0.4\`;
  } else {
    return \`https://ui-avatars.com/api/?name=\${text}&background=cccccc&color=666666&rounded=true&size=64&font-size=0.4\`;
  }
};
`;

  fs.writeFileSync('src/utils/certCenters.js', jsContent);
  console.log('Done generating certCenters.js');
}

run();
