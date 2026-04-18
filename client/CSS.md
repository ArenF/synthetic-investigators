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

### 배경색

```css
--bg-base:     #0a0e1a;   /* 최하단 배경 */
--bg-panel:    #0f1526;   /* 패널 배경 */
--bg-elevated: #161d33;   /* 카드·입력 배경 */
--bg-border:   #1e2744;   /* 테두리·구분선 */
--bg-card:     #00385a;   /* 클릭 가능한 카드 기본 */
--bg-card-hover: #45538a; /* 카드 hover */
```

### 텍스트 색

```css
--text-primary: #e2e8f0;  /* 본문 */
--text-muted:   #94a3b8;  /* 보조 텍스트 */
--text-desc:    #6a90b4;  /* 설명 텍스트 */
```

### 강조색

```css
--teal:         #14b8a6;  /* 주 강조색 (포커스, 스크롤바 등) */
--teal-light:   #2dd4bf;  /* 밝은 강조색 */
--color-purple: #b199db;  /* 버튼·체크박스 강조 */
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
