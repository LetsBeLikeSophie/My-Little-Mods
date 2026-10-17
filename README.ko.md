# My Little Mods

[English](README.md) · **한국어**

Claude Code 사이드 패널에 뜨는 작은 모드(mod) 두 개예요. Claude가 지금 무엇을 하는지, 사용 한도가 얼마나 남았는지, 무엇을 만들었는지 한눈에 보여 줘요. [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions)와 같은 제작자가 만들었어요.

| 모드 | 어떤 모습 |
| --- | --- |
| **pixel-activity** (Adventure Log) | 픽셀아트 RPG 야영지. 고른 캐릭터가 Claude가 쓰는 도구에 맞춰 행동해요 |
| **simple-dash** | 그림 없이 정보만 보여 주는 대시보드. 포인트 색만 골라요 |

둘 중 마음에 드는 것 하나만 설치해도 되고, 둘 다 설치해도 돼요.

## 설치

터미널에서 Claude Code를 열고 프롬프트에 입력해요.

```
/plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install simple-dash --marketplace LetsBeLikeSophie/My-Little-Mods
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
- 열기: `/pixel` · 캐릭터 바꾸기: `/pixel mage cat`

## simple-dash

- 지금 하는 일, 사용 한도(밝은 부분 = 방금 요청이 쓴 양), 결과물, 시간 쓴 곳, 로그를 텍스트와 막대로 보여 줘요.
- 포인트 색: 파랑, 초록, 보라, 주황, 흑백. 라이트·다크 전환.
- 열기: `/dash` · 색 바꾸기: `/dash green`

## 알아 둘 것

- 모드(hooks module)는 Claude Code의 얼리 액세스 기능이에요. 버전에 따라 동작이 바뀔 수 있어요.
- 사용 한도는 구독 요금제(Pro/Max)에서만 보이고, 첫 응답이 온 뒤에 나타나요.
- 모든 정보는 내 컴퓨터 안에서만 처리돼요. 결과물 링크를 누르면 브라우저나 연결된 앱으로 열려요(Windows).

## 라이선스

코드는 [MIT](LICENSE). pixel-activity에 들어 있는 픽셀 폰트 [Galmuri11](https://github.com/quiple/galmuri)은 SIL Open Font License 1.1을 따라요([OFL-Galmuri.txt](plugins/pixel-activity/OFL-Galmuri.txt)).

made by Sophie
