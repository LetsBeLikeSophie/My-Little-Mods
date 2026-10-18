# 🍃 My Little Calm

[English](README.md) · **한국어**

Claude Code 옆 패널의 조용한 대시보드예요. 얇은 선 아이콘의 상태 카드, 얇은 링 세 개로 보는 사용 한도, 세리프 제목, 그리고 고른 포인트 색 하나가 화면 전체를 은은하게 물들여요.

Claude Code용 [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) 세 개(RPG, Calm, Day) 중 하나예요. 같은 정보를 각자 다른 분위기로 보여 줘요.

## 설치

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install my-little-calm@my-little-mods
```

설치한 다음 새 세션을 열어요. 지우려면 `/plugin uninstall my-little-calm@my-little-mods`.

## 쓰는 법

- `/log-calm`으로 열어요. 🔵🟢🟣🟠⚪나 `/log-calm green`으로 포인트 색을 골라요 (blue, green, purple, orange, mono).
- ☾/☀는 다크·라이트, 🔔는 알림 켜기·끄기예요.

## 보여 주는 것

- **지금:** 하는 일, 쓰는 도구와 파일, 걸린 시간, 그리고 승인을 기다릴 때 눈에 띄는 표시
- **사용 한도:** 5시간·주간 한도, 방금 요청이 늘린 만큼, 다시 차는 시간
- **세션 메모리:** 대화가 얼마나 찼는지 (꽉 차면 Claude Code가 알아서 압축해요)
- **시간 쓴 곳**, **결과물**(열기 버튼), **로그**(최신이 위), **누적 기록**
- **입력창 주변:** 이 모드 패널이 화면에 있을 때, 입력창 위 얇은 한 줄과 아래 오른쪽 작은 표시

## 실행하는 것과 저장하는 것

모든 정보는 내 컴퓨터 안에만 있고, 네트워크로 아무것도 보내지 않아요.

- **윈도우 알림과 소리:** 승인을 기다리거나 긴 요청이 끝나면 `powershell`로 윈도우 알림(이 모드 그림 포함)을 띄우고 들어 있는 소리를 재생해요. 🔔 버튼으로 끌 수 있어요.
- **언어:** 윈도우에서는 세션마다 한 번 `powershell Get-UICulture`로 한국어/영어를 고르고, 다른 OS에서는 `LANG` / `LC_ALL`을 읽어요.
- **결과물 열기:** 열기 버튼은 `explorer.exe`로 파일이나 링크를 열어요.
- **마지막으로 연 모드:** `~/.claude/my-little-mods.json`에 `{"last": "<모드>"}`를 적어서, 새 세션에서 마지막에 쓴 모드만 다시 열어요.
- **설정과 누적 기록**은 Claude Code의 플러그인 저장소에 보관돼요.

## 라이선스

MIT, 만든 사람 Sophie.