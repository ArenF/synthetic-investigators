# CSS 작성 규칙

## 1. 세 가지 레이어

| 레이어 | 위치 | 용도 |
|--------|------|------|
| **Tailwind** | HTML 인라인 `class=""` | 레이아웃·간격·크기처럼 간단히 인라인으로 처리되는 것들 |
| **scoped CSS** | `<style>` 블록 (snake_case) | 컴포넌트 고유의 비주얼 스타일 |
| **CSS 변수** | `src/app.css` `:root` | 여러 컴포넌트에서 반복 사용되는 값 |

---

## 2. Tailwind로 처리하는 것들

레이아웃·위치·간격처럼 값 하나로 표현되는 속성들.

```html
<div class="relative flex flex-col items-center justify-center w-full gap-2 p-4">
```

**Tailwind 사용 목록:**
- `display` — `flex`, `grid`, `hidden` 등
- `flex-direction` — `flex-row`, `flex-col`
- `justify-content` / `align-items` — `justify-center`, `items-center` 등
- `position` — `relative`, `absolute`
- `width` / `height` — `w-full`, `h-screen`, `min-w-0` 등
- `gap` — `gap-1`, `gap-2` 등 (4px 단위)
- `padding` / `margin` — `p-2`, `px-4`, `mt-2` 등

---

## 3. scoped CSS로 처리하는 것들

한 컴포넌트에만 적용되는 비주얼 속성들. `<style>` 블록에 snake_case 클래스로 작성.

```css
.clickable_card {
  background-color: var(--bg-card);
  border-radius: 15px;
  box-shadow: 5px 10px 5px 2px #01162b;
  transition: all 0.5s ease-in-out;
}
```

**scoped CSS 사용 목록:**
- `background-color`, `color` (디자인 토큰 외의 컴포넌트 고유 색상)
- `border-radius`
- `box-shadow`
- `transition`
- `font-family` (CSS 변수 사용), `font-size`, `font-weight`
- `writing-mode` 등 Tailwind로 표현하기 어색한 속성들

### 네이밍: snake_case

Tailwind 클래스명(`flex-col`, `bg-base`)과 구분하기 위해 커스텀 클래스는 **snake_case** 사용.

```css
/* good */
.input_container { ... }
.extend_thinking_container { ... }

/* bad */
.inputContainer { ... }
.input-container { ... }
```

---

## 4. CSS 변수 (`src/app.css`)

### 밤바다 계열 — 배경·패널·텍스트 (정보 전달, 높은 가독성)

```css
--sea-deep:       #01162b;  /* 최하단 배경 */
--sea-panel:      #00385a;  /* 카드·패널 배경 */
--sea-text:       #6a90b4;  /* 보조 텍스트·캡션 (deep 위) */
--sea-text-light: #d2dbeb;  /* 본문 텍스트 (panel 위) */
```

### 보랏빛 은하수 계열 — 인터랙티브·강조·액센트 (버튼, 체크박스, 포커스)

```css
--galaxy-bg:      #262e4c;  /* 인터랙티브 요소 배경 */
--galaxy-hover:   #45538a;  /* hover·활성 상태 배경 */
--galaxy-accent:  #b199db;  /* 액센트·아이콘·강조 텍스트 */
--galaxy-label:   #c9ccd3;  /* 버튼 라벨·큰 텍스트 (hover 위) */
--galaxy-muted:   #724972;  /* 비활성 보라·밝은 면 위 보조 */
```

### 폰트

```css
--font-base: 'Inter', 'Noto Sans KR', system-ui, sans-serif;  /* 본문 */
--font-ui:   'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;  /* UI 레이블·버튼 */
```

---

## 5. 판단 기준 요약

```
레이아웃(flex/position/gap/padding)인가?
  → Yes: Tailwind 인라인

여러 컴포넌트에서 반복 사용하는 값인가?
  → Yes: app.css CSS 변수로 추가

컴포넌트 고유의 비주얼 스타일인가?
  → Yes: <style> snake_case 클래스, var() 참조
```
