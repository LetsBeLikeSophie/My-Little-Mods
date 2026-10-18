import os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'plugins')  

COMMON_EN = """## What it shows

- **Now:** the task, the tool and file in use, how long it has taken, and a clear sign when Claude waits for your approval
- **Usage limits:** the 5-hour and weekly limits, what the last request added, and when they reset
- **Session memory:** how full the conversation is (Claude Code compacts it by itself when full)
- **Where the time went**, **results** (documents and artifacts, with Open buttons), a **log** (newest on top) and **all-time totals**
- **Around the prompt:** a slim line above it and a small mark at the right of the footer, while this mod's pane is on screen

## What it runs, decides and stores

Everything stays on your computer. The mod sends nothing over the network and reads no credentials.

- **One program, Windows PowerShell, always with a fixed script.** What changes (a title, a file path) is passed in environment variables, never in the command line. It runs PowerShell for three things:
  - **Alerts:** when Claude waits for your approval, or finishes a request that took 30 seconds or more, it shows a small Windows notification saying what happened, with this mod's logo (`images/`), and plays one of its sounds (`sounds/`). Turn alerts off with the 🔔 button; then only the in-app toast shows. On macOS and Linux it uses Claude Code's own notification and sound instead.
  - **Language:** once per session, `(Get-UICulture).Name` picks Korean or English. Elsewhere it reads `LANG` / `LC_ALL`.
  - **Opening a result:** the Open button and the GitHub button run `Start-Process` on that file or link.
- **Hooks, and what they decide:** it watches tool calls, requests and usage to draw the pane; it never changes or blocks a tool call. It does not take part in permission decisions: it listens to Claude Code's `Notification` event, and when that says Claude needs your permission it shows "waiting for approval" and rings the alert. It also draws the pane, the line above the prompt, a mark in the footer, and adds one command.
- **What it writes:** only Claude Code's own plugin store for this mod: its settings (theme, alerts and the like), its all-time totals, and whether its pane was open, so a new session reopens it. No files of yours are written.
"""

COMMON_KO = """## 보여 주는 것

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
"""

MODS = {
    'rpg': dict(
        title='⚔️ My Little RPG',
        en_intro='A pixel-art camp in Claude Code\'s side pane: your chosen hero acts out what Claude is doing. Reading is studying a book, editing is weapon practice, a command is a spell, and tests are a bug hunt. Finish a request and the hero finds a glowing treasure chest.',
        ko_intro='Claude Code 옆 패널의 픽셀아트 야영지예요. 고른 캐릭터가 Claude가 하는 일을 따라 해요. 파일 읽기는 책 공부, 코드 수정은 무기 연습, 명령 실행은 주문, 테스트는 버그 사냥이에요. 요청이 끝나면 빛나는 보물상자를 찾아요.',
        en_use='- Open with `/log-rpg`. Pick a class and species with the class button or `/log-rpg mage cat` (warrior, mage, hunter, rogue, priest / human, cat, dog, bear, rabbit).\n- 📜 opens the legend of scenes, ☾/☀ switches dark and light, 🔔 turns alerts on or off.\n- Levels and XP add up across sessions; the sky follows the real time of day.',
        ko_use='- `/log-rpg`로 열어요. 직업 버튼이나 `/log-rpg mage cat`으로 직업·종족을 바꿔요 (전사, 마법사, 사냥꾼, 도적, 사제 / 사람, 고양이, 강아지, 곰, 토끼).\n- 📜는 장면 표, ☾/☀는 다크·라이트, 🔔는 알림 켜기·끄기예요.\n- 레벨과 경험치는 세션을 넘어 쌓이고, 하늘은 실제 시간을 따라가요.',
        extra_en='\nThe pixel font [Galmuri11](https://github.com/quiple/galmuri) is bundled under the SIL Open Font License 1.1 ([OFL-Galmuri.txt](OFL-Galmuri.txt)).\n',
        extra_ko='\n픽셀 글꼴 [Galmuri11](https://github.com/quiple/galmuri)은 SIL Open Font License 1.1로 들어 있어요 ([OFL-Galmuri.txt](OFL-Galmuri.txt)).\n',
    ),
    'calm': dict(
        title='🍃 My Little Calm',
        en_intro='A quiet dashboard in Claude Code\'s side pane: a status card with a thin line icon, your usage limits as three thin rings, serif titles, and one soft accent color of your choice washing the whole pane.',
        ko_intro='Claude Code 옆 패널의 조용한 대시보드예요. 얇은 선 아이콘의 상태 카드, 얇은 링 세 개로 보는 사용 한도, 세리프 제목, 그리고 고른 포인트 색 하나가 화면 전체를 은은하게 물들여요.',
        en_use='- Open with `/log-calm`. Pick the accent with 🔵🟢🟣🟠⚪ or `/log-calm green` (blue, green, purple, orange, mono).\n- ☾/☀ switches dark and light, 🔔 turns alerts on or off.',
        ko_use='- `/log-calm`으로 열어요. 🔵🟢🟣🟠⚪나 `/log-calm green`으로 포인트 색을 골라요 (blue, green, purple, orange, mono).\n- ☾/☀는 다크·라이트, 🔔는 알림 켜기·끄기예요.',
        extra_en='', extra_ko='',
    ),
    'day': dict(
        title='🌼 My Little Day',
        en_intro='A warm journal in Claude Code\'s side pane: a hello by name, a "now" card that wears the sky of the hour (dawn, day, sunset or night) with a small sun or moon, pastel cards for your usage limits, and pill charts of where the time went.',
        ko_intro='Claude Code 옆 패널의 따뜻한 일지예요. 이름을 불러 인사하고, "지금" 카드는 시간대 하늘(새벽, 낮, 노을, 밤)과 작은 해·달을 입어요. 사용 한도는 파스텔 카드, 시간 쓴 곳은 알약 그래프로 보여요.',
        en_use='- Open with `/log-day`. Set the name it greets with `/log-day name Sophie`; until then it just says hello.\n- 🌙/☀️ switches light and dark, 🔔 turns alerts on or off.',
        ko_use='- `/log-day`로 열어요. 인사할 이름은 `/log-day name 소피`로 정해요. 정하기 전에는 이름 없이 인사해요.\n- 🌙/☀️는 라이트·다크, 🔔는 알림 켜기·끄기예요.',
        extra_en='', extra_ko='',
    ),
}

for m, d in MODS.items():
    name = f'my-little-{m}'
    en = f"""# {d['title']}

**English** · [한국어](README.ko.md)

{d['en_intro']}

One of three [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) for Claude Code (RPG, Calm and Day). They show the same things, each in its own style.

## Install

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install {name}@my-little-mods
```

Start a new session afterwards. To remove it: `/plugin uninstall {name}@my-little-mods`; Claude Code removes its stored settings with it.

## Use

{d['en_use']}

{COMMON_EN}
## License

MIT, by Sophie.{d['extra_en']}"""
    ko = f"""# {d['title']}

[English](README.md) · **한국어**

{d['ko_intro']}

Claude Code용 [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) 세 개(RPG, Calm, Day) 중 하나예요. 같은 정보를 각자 다른 분위기로 보여 줘요.

## 설치

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install {name}@my-little-mods
```

설치한 다음 새 세션을 열어요. 지우려면 `/plugin uninstall {name}@my-little-mods`.

## 쓰는 법

{d['ko_use']}

{COMMON_KO}
## 라이선스

MIT, 만든 사람 Sophie.{d['extra_ko']}"""
    open(f'{root}/{m}/README.md', 'w', encoding='utf-8').write(en)
    open(f'{root}/{m}/README.ko.md', 'w', encoding='utf-8').write(ko)
print('ok')
