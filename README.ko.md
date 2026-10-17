# My Little Mods

[English](README.md) · **한국어**

Claude Code 사이드 패널에 뜨는 작은 모드(mod) 세 개예요. 셋 다 같은 정보(지금 하는 일, 사용 한도, 시간 쓴 곳, 결과물, 로그)를 각자 다른 분위기로 보여 줘요. Claude가 지금 무엇을 하는지, 사용 한도가 얼마나 남았는지, 무엇을 만들었는지 한눈에 보여 줘요. [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions)와 같은 제작자가 만들었어요.

| 모드 | 어떤 모습 |
| --- | --- |
| **pixel-activity** (Adventure Log) | 픽셀아트 RPG 야영지. 고른 캐릭터가 Claude가 쓰는 도구에 맞춰 행동해요 |
| **simple-dash** | 차분한 느낌: 은은한 바탕에 하얀 카드, 얇은 링과 가는 글씨. 포인트 색을 골라요 |
| **daily-journal** | 따뜻한 느낌: 크림 바탕, 표정이 바뀌는 해 카드, 파스텔 칩과 알약 그래프 |

마음에 드는 것 하나만 설치해도 되고, 여러 개 설치해도 돼요.

## 설치

터미널에서 Claude Code를 열고 프롬프트에 입력해요.

```
/plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install simple-dash --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install daily-journal --marketplace LetsBeLikeSophie/My-Little-Mods
```

처음이면 `Add marketplace?`가 나와요. `y`를 누르고 범위(user)를 고르면 끝이에요.

쉘에서 설치할 때:

```bash
claude plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

Claude 데스크톱 앱에서는 `/plugin`이 안 돼요. 입력창 옆 **+ → Plugins → Add marketplace**에 `LetsBeLikeSophie/My-Little-Mods`를 넣고, **Add plugin**에서 고르면 돼요.

## pixel-activity (Adventure Log)

- **지금 하는 일을 그림으로:** 파일 읽기는 책 읽기, 코드 수정은 무기 수련, 명령 실행은 주문, 테스트는 슬라임(버그) 사냥이에요. 그림 설명에서 전체 목록을 볼 수 있어요.
- **직업 5개 × 종족 5개:** 전사, 마법사, 사냥꾼, 도적, 사제 / 사람, 고양이, 강아지, 곰, 토끼. 직업마다 행동이 달라요.
- **사용 한도 HUD:** 5시간·주간 한도를 경험치 바처럼 보여 줘요. 방금 요청이 쓴 만큼은 밝게 빛나요.
- **결과물, 시간 쓴 곳, 로그:** 만든 문서·아티팩트 링크, 생각·작업 시간 그래프, 한 줄 로그.
- 하늘은 실제 시간(낮·노을·밤)을 따라가요. 라이트·다크, 한국어·영어(시스템 설정)를 지원해요.
- **알림:** 승인을 기다리면 캐릭터가 손을 들고, 몇 초 뒤 윈도우 알림과 효과음이 나요. 30초 넘게 걸린 요청이 끝나도 알려 줘요. 🔔 버튼으로 켜고 꺼요.
- **레벨·경험치:** 끝낸 요청, 잡은 버그, 행동 수가 세션이 끝나도 쌓여요.
- 열기: `/rpg` · 캐릭터 바꾸기: `/rpg mage cat`

## simple-dash

- 얇은 선 아이콘의 상태 카드, 얇은 링 세 개로 보는 사용 한도(밝게 빛나는 부분 = 방금 요청이 쓴 양), 시간 쓴 곳, 결과물, 로그.
- 포인트 색: 파랑, 초록, 보라, 주황, 흑백. 라이트·다크 전환.
- 승인 대기·긴 작업 완료 알림(켜고 끄기), 누적 기록.
- 열기: `/calm` · 색 바꾸기: `/calm green`

## daily-journal

- 이름을 부르는 인사, 상태에 따라 표정이 바뀌는 해 카드, 파스텔 칩으로 보는 한도, 큰 숫자와 알약 막대(시간 쓴 곳), 파스텔 결과물 카드, 로그.
- 열기: `/day` · 이름 정하기: `/day name 소피` (안 정하면 git 이름)

## 알아 둘 것

- 모드(hooks module)는 Claude Code의 얼리 액세스 기능이에요. 버전에 따라 동작이 바뀔 수 있어요.
- 사용 한도는 구독 요금제(Pro/Max)에서만 보이고, 첫 응답이 온 뒤에 나타나요.
- 모든 정보는 내 컴퓨터 안에서만 처리돼요. 결과물 링크를 누르면 브라우저나 연결된 앱으로 열려요(Windows).

## 개발할 때

세 모드가 같이 쓰는 코드는 `shared/`에 있어요(기록 로직 `core.ts`, 알림 `alerts.ts`, 로그·열기 버튼·알림 버튼·제작자 줄 `parts.tsx`). 모드는 따로 설치되기 때문에 각자 `hooks/` 폴더에 복사본을 갖고 있어요. `shared/`의 파일을 고친 뒤 아래 명령으로 복사해요.

```bash
node scripts/sync-shared.mjs
```

`node scripts/sync-shared.mjs --check`는 복사본이 원본과 다르면 실패해요.

## 라이선스

코드는 [MIT](LICENSE). pixel-activity에 들어 있는 픽셀 폰트 [Galmuri11](https://github.com/quiple/galmuri)은 SIL Open Font License 1.1을 따라요([OFL-Galmuri.txt](plugins/pixel-activity/OFL-Galmuri.txt)).

made by Sophie
