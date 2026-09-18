# 숲속의 피아노 — Vercel 배포 순서

1. https://vercel.com 접속 → GitHub 계정으로 가입/로그인
2. 대시보드에서 "Add New… → Project" 대신, 더 쉬운 방법:
   터미널 없이 하려면 이 폴더를 GitHub 저장소에 올린 뒤 Vercel에서 그 저장소를 Import 하면 됩니다.
   (index.html 과 api/read.js 의 폴더 구조를 그대로 유지할 것)
3. Import 화면에서 설정은 전부 기본값 그대로 → Deploy
4. 배포가 끝나면: 프로젝트 → Settings → Environment Variables 에서
   - Name: ANTHROPIC_API_KEY
   - Value: (본인의 Claude API 키)
   저장 후, Deployments 탭에서 최신 배포 → ⋯ 메뉴 → Redeploy (환경변수 적용)
5. 발급된 주소(https://프로젝트명.vercel.app) 접속 → 악보 올려서 테스트

주의: API 키는 위 환경변수에만 넣습니다. index.html 이나 read.js 코드 안에 직접 쓰지 마세요.
문제 발생 시 이 폴더를 클로드 채팅에 다시 올리고 에러 메시지를 알려주면 됩니다.
