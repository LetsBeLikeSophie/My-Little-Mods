# ⚔️ My Little RPG

[English](README.md) · **한국어**

Claude Code 옆 패널의 픽셀아트 야영지예요. 고른 캐릭터가 Claude가 하는 일을 따라 해요. 파일 읽기는 책 공부, 코드 수정은 무기 연습, 명령 실행은 주문, 테스트는 버그 사냥이에요. 요청이 끝나면 빛나는 보물상자를 찾아요.

Claude Code용 [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) 세 개(RPG, Calm, Day) 중 하나예요. 같은 정보를 각자 다른 분위기로 보여 줘요.

## 설치

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install my-little-rpg@my-little-mods
```

설치한 다음 새 세션을 열어요. 지우려면 `/plugin uninstall my-little-rpg@my-little-mods`.

## 쓰는 법

- `/log-rpg`로 열어요. 직업 버튼이나 `/log-rpg mage cat`으로 직업·종족을 바꿔요 (전사, 마법사, 사냥꾼, 도적, 사제 / 사람, 고양이, 강아지, 곰, 토끼).
- 📜는 장면 표, ☾/☀는 다크·라이트, 🔔는 알림 켜기·끄기예요.
- 레벨과 경험치는 세션을 넘어 쌓이고, 하늘은 실제 시간을 따라가요.

## 보여 주는 것

- **지금:** 하는 일, 쓰는 도구와 파일, 걸린 시간, 그리고 승인을 기다릴 때 눈에 띄는 표시
- **사용 한도:** 5시간·주간 한도, 방금 요청이 늘린 만큼, 다시 차는 시간
- **세션 메모리:** 대화가 얼마나 찼는지 (꽉 차면 Claude Code가 알아서 압축해요)
- **시간 쓴 곳**, **결과물**(열기 버튼), **로그**(최신이 위), **누적 기록**
- **입력창 주변:** 이 모드 패널이 화면에 있을 때, 입력창 위 얇은 한 줄과 아래 오른쪽 작은 표시

## 실행하는 것, 결정하는 것, 저장하는 것

모든 정보는 내 컴퓨터 안에만 있어요. 네트워크로 아무것도 보내지 않고, 인증 정보도 읽지 않아요.

- **실행하는 프로그램은 윈도우 PowerShell 하나뿐이고, 항상 고정된 스크립트로 실행해요.** 바뀌는 값(알림 제목, 파일 경로)은 명령줄이 아니라 환경 변수로 넘겨요. PowerShell은 세 가지에 써요.
  - **알림:** 승인을 기다리거나 30초 이상 걸린 요청이 끝나면, 무슨 일인지 알려 주는 작은 윈도우 알림(이 모드 로고 `images/` 포함)을 띄우고 소리(`sounds/`)를 재생해요. 🔔 버튼으로 끄면 앱 안 알림만 떠요. macOS·Linux에서는 Claude Code 자체 알림과 소리를 써요.
  - **언어:** 세션마다 한 번 `(Get-UICulture).Name`으로 한국어/영어를 골라요. 다른 OS에서는 `LANG` / `LC_ALL`을 읽어요.
  - **결과물 열기:** 열기 버튼과 GitHub 버튼은 그 파일이나 링크를 `Start-Process`로 열어요.
- **훅과 결정:** 도구 실행, 요청, 사용량을 지켜보고 패널을 그려요. 도구 실행을 바꾸거나 막지 않아요. 권한 결정에는 끼어들지 않아요. Claude Code의 `Notification` 이벤트를 듣고, 권한이 필요하다는 알림이 오면 "승인 대기 중" 표시와 알림만 띄워요. 그 밖에 패널, 입력창 위 한 줄, 아래 표시를 그리고 명령어 하나를 추가해요.
- **저장하는 것:** 이 모드의 Claude Code 플러그인 저장소에만 써요. 설정(테마, 알림 등), 누적 기록, 그리고 패널이 열려 있었는지(새 세션에서 다시 열려고)예요. 내 파일은 건드리지 않아요.

## 라이선스

MIT, 만든 사람 Sophie.
픽셀 글꼴 [Galmuri11](https://github.com/quiple/galmuri)은 SIL Open Font License 1.1로 들어 있어요 ([OFL-Galmuri.txt](OFL-Galmuri.txt)).
