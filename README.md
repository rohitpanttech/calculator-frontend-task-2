# Quantum Calc - Premium Glassmorphic Calculator

**Quantum Calc** is a premium, state-of-the-art web calculator featuring a highly responsive, modern glassmorphic interface, tactile click sound synthesis, a persistent history panel, dark/light theme options, keyboard support, and context-aware arithmetic percentage evaluation. 

This repository contains the codebase for **Task 2** of the **CodeAlpha Online Front-End Web Development Internship**.

---

## 🚀 Live Demo & Visuals

- **Aesthetics**: Glassmorphism, smooth animations, dynamic background glow effects, and modern Outfit typography.
- **Dynamic Scale**: Display text scales down automatically as character length grows to avoid wrapping or visual overflow.
- **Audio Feedback**: tactile physical click synthesis powered by Web Audio API (zero audio files needed).

---

## 🧠 Advanced Percentage (%) Calculation Logic

Typical basic calculator implementations simply divide numbers by 100 on a `%` press (e.g. `9%` $\rightarrow$ `0.09`). Quantum Calc implements standard calculator percentage logic supporting direct inline arithmetic:

1. **Addition (`A + B%`)**: Evaluates as $A + (A \times B / 100)$
   - *Example*: `50 + 10%` $\rightarrow$ `55`
2. **Subtraction (`A - B%`)**: Evaluates as $A - (A \times B / 100)$
   - *Example*: `50 - 10%` $\rightarrow$ `45`
3. **Multiplication (`A × B%`)**: Evaluates as $A \times (B / 100)$
   - *Example*: `50 × 10%` $\rightarrow$ `5`
4. **Division (`A ÷ B%`)**: Evaluates as $A / (B / 100)$
   - *Example*: `50 ÷ 10%` $\rightarrow$ `500`
5. **Standalone (`B%`)**: Divides by 100 if no preceding operator is active.
   - *Example*: `9%` $\rightarrow$ `0.09`

---

## ✨ Features

- **Math Engine**: Custom token-based DMAS (Division, Multiplication, Addition, Subtraction) evaluator. No unsafe `eval()` calls.
- **Haptic & Sound Feedback**: Synthesizes a high-fidelity mechanical click on every input and offers simple UI toggles.
- **History Panel**: Collapsible drawer tracking past equations, with direct expression recovery when clicked, persisting locally using `localStorage`.
- **Keyboard Mappings**: Built-in keyboard support for standard keys:
  - Numbers `0` - `9`, `.`, operators `+`, `-`, `*` / `x`, `/`, `%`
  - `Enter` / `=` to evaluate, `Backspace` to delete, `Escape` / `c` to clear.
- **Graceful Error Handling**: Elegant handling of invalid states and division by zero.

---

## 🛠️ Technology Stack

- **Structure**: Semantic HTML5
- **Style**: Custom Vanilla CSS (Responsive variables, backdrop filters)
- **Logic**: Vanilla JavaScript (Infix token parser)

---

## 📁 Repository Structure

```
.
├── index.html     # Semantic structure & layout
├── style.css      # Core styles, glassmorphism design tokens & media queries
├── script.js      # App state machine, click synth, and math engines
└── README.md      # Project documentation
```

---

## 🎓 About the Project

This project was built as part of the **CodeAlpha Web Development Internship program**.
- **Task 2**: Build an online calculator application with an appealing UI and enhanced mathematical support.
