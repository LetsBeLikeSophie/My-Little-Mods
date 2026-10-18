# My Little Mods

[English](README.md) · **한국어**

Claude가 지금 뭘 하는지 보여 주는 Claude Code용 작은 모드 세 개예요. 셋 다 같은 정보를 각자 다른 분위기로 보여 줘요. [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions)와 같은 제작자가 만들었어요.

| 모드 | 명령어 | 어떤 모습 |
| --- | --- | --- |
| **RPG** | `/rpg` | 픽셀아트 야영지. 고른 캐릭터가 Claude가 쓰는 도구에 맞춰 행동해요 |
| **Calm** | `/calm` | 차분한 대시보드. 은은한 바탕에 하얀 카드, 얇은 링, 세리프 제목, 포인트 색 하나 |
| **Day** | `/day` | 따뜻한 일지. 시간대 하늘, 파스텔 한도 카드, 알약 그래프 |

셋 다 보여 주는 것:

- **지금:** 하는 일, 쓰는 도구와 파일, 걸린 시간, 그리고 승인을 기다릴 때 눈에 띄는 표시
- **사용 한도:** 5시간·주간 한도와 방금 요청이 늘린 만큼, 다시 차는 시간
- **세션 메모리:** 대화가 얼마나 찼는지 (꽉 차면 알아서 압축돼요)
- **시간 쓴 곳**, **결과물**(문서·아티팩트, 열기 버튼), **로그**(최신이 위), **누적 기록**
- **알림:** 승인이 필요하거나 긴 요청이 끝나면, 모드마다 다르게 꾸민 윈도우 알림과 소리 (🔔로 끄기)
- **입력창 주변:** 입력창 위 얇은 한 줄, 입력창 아래 오른쪽 작은 표시

## 설치

다른 사람도 이 깃허브 저장소에서 바로 설치해요. Claude Code 터미널 세션의 입력창에서:

```
/plugin install rpg --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install calm --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install day --marketplace LetsBeLikeSophie/My-Little-Mods
```

처음엔 `Add marketplace?`에 `y`, 그다음 user 범위를 고르면 돼요. 하나만 깔아도 되고 셋 다 깔아도 돼요.

셸에서:

```bash
claude plugin install rpg --marketplace LetsBeLikeSophie/My-Little-Mods
```

`/plugin`이 안 되는 Claude 데스크톱 앱에서는: 입력창 옆 **+** → **Plugins → Add marketplace**에 `LetsBeLikeSophie/My-Little-Mods`를 넣고 **Add plugin**.

## 쓰는 법

- 모드는 명령어로 열려요. 새 세션에서는 마지막에 연 모드 하나만 다시 열려요.
- 여러 개 깔아도 입력창 위 줄, 아래 표시, 알림은 지금 화면에 보이는 모드 것만 나와서 겹치지 않아요.
- 시스템 언어에 따라 한국어 또는 영어로 나와요.

### RPG — `/rpg`

- 일을 그림으로: 파일 읽기는 책 공부, 코드 수정은 무기 연습, 명령 실행은 주문, 테스트는 버그 사냥. 📜로 장면 표를 열어요.
- 직업 5개 × 종족 5개, 직업마다 움직임이 달라요. 직업 버튼이나 `/rpg mage cat`으로 바꿔요.
- 한도는 경험치 바, 세션을 넘어 쌓이는 레벨, 실제 시간을 따라가는 하늘.
- 라이트·다크 (☾/☀).

### Calm — `/calm`

- 얇은 선 아이콘의 상태 카드, 얇은 링 세 개로 보는 한도, 세리프 제목과 숫자.
- 🔵🟢🟣🟠⚪로 포인트 색을 골라요 (`/calm green`도 돼요). 화면 전체가 그 색으로 은은하게 물들어요. 라이트·다크.

### Day — `/day`

- 이름을 불러 주는 인사: `/day name 소피` (안 정하면 git 이름).
- "지금" 카드가 시간대 하늘을 입어요: 새벽, 낮, 노을, 밤과 작은 해·달.
- 파스텔 한도 카드, 큰 숫자와 알약 그래프, 색색으로 쌓이는 결과물. 라이트·다크 (🌙/☀️).

## 알아 두면 좋은 것

- 모드(hooks 모듈)는 Claude Code의 미리보기 기능이라 버전에 따라 바뀔 수 있어요.
- 사용 한도는 구독 요금제(Pro/Max)에서, 첫 답변 이후에 보여요.
- 모든 정보는 내 컴퓨터 안에만 있어요. 결과물 링크는 브라우저나 파일 앱으로 열려요 (Windows).

## 개발할 때

모든 모드가 같이 쓰는 코드는 `shared/`에 있어요 (기록 정리 `core.ts`, 알림 `alerts.ts`, 로그·버튼·패널 도우미 `parts.tsx`). 모드는 하나씩 따로 설치되니까 각자 `hooks/` 폴더에 복사본을 갖고 있어요. `shared/`에서 고친 다음 복사해요:

```bash
node scripts/sync-shared.mjs
```

`node scripts/sync-shared.mjs --check`는 복사본이 오래됐으면 실패해요. 알림 그림은 `python scripts/alert-art.py plugins`로 그려요.

## 라이선스

코드: [MIT](LICENSE). RPG에 들어 있는 픽셀 글꼴 [Galmuri11](https://github.com/quiple/galmuri)은 SIL Open Font License 1.1이에요 ([OFL-Galmuri.txt](plugins/rpg/OFL-Galmuri.txt)).

made by Sophie
