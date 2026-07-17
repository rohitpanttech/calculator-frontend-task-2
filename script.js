/**
 * Quantum Calc - Premium Calculator Application Logic
 * Implements states, keyboard bindings, custom token evaluation, sound synthesis, 
 * local storage caching, history logs, and accessibility features.
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const primaryDisplay = document.getElementById("primaryDisplay");
    const expressionDisplay = document.getElementById("expressionDisplay");
    const keypad = document.querySelector(".calculator-keypad");
    
    // Control Buttons
    const themeToggle = document.getElementById("themeToggle");
    const soundToggle = document.getElementById("soundToggle");
    const historyToggle = document.getElementById("historyToggle");
    const closeHistory = document.getElementById("closeHistory");
    const historyPanel = document.getElementById("historyPanel");
    const historyList = document.getElementById("historyList");
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");

    // Icon Sub-elements (for toggle state rendering)
    const moonIcon = themeToggle.querySelector(".moon-icon");
    const sunIcon = themeToggle.querySelector(".sun-icon");
    const soundOnIcon = soundToggle.querySelector(".sound-on-icon");
    const soundOffIcon = soundToggle.querySelector(".sound-off-icon");

    // Application State Variables
    let currentInput = "0";      // The number currently being entered
    let expression = [];        // Accumulates numbers and operator tokens (e.g. [12, "+", 4])
    let isResultDisplay = false; // Flag to check if screen is displaying a evaluated result
    let soundEnabled = true;     // Sound feedback state
    let history = [];           // Array of past calculations: {expr: string, result: string}
    let audioCtx = null;         // Web Audio Context for synthesizer

    // Precedence configurations for operator evaluation
    const PRECEDENCE = {
        '+': 1,
        '-': 1,
        '*': 2,
        '/': 2
    };

    /* ==========================================================================
       Initial Setup & Cache Restoring
       ========================================================================== */
    initTheme();
    initSound();
    initHistory();

    /* ==========================================================================
       Audio Feedback System (Web Audio API Synthesizer)
       ========================================================================== */
    /**
     * Synthesizes a clean, high-fidelity mechanical click sound.
     * Keeps application light and does not rely on external .mp3/audio assets.
     */
    function playClickSound() {
        if (!soundEnabled) return;
        try {
            // Lazy load AudioContext on first user interaction
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            // Audio parameters for mechanical tactile click
            osc.type = 'sine';
            // Start at a clear high frequency and sweep downwards quickly
            osc.frequency.setValueAtTime(950, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.04);

            // Envelope to decay rapidly to zero sound
            gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.045);

            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.05);
        } catch (error) {
            console.warn("Dynamic sound synthesis is disabled or unsupported in this environment:", error);
        }
    }

    /**
     * Performs a slight physical vibration on mobile devices supporting haptics.
     */
    function triggerHaptics() {
        if (navigator.vibrate) {
            navigator.vibrate(10); // Subtle 10ms haptic feedback tap
        }
    }

    /* ==========================================================================
       Visual Display & Font Autoscale Logic
       ========================================================================== */
    /**
     * Adapts font-size dynamically based on display string length to avoid line wrapping.
     */
    function autoscaleDisplayFont() {
        const textLength = primaryDisplay.textContent.length;
        if (textLength <= 7) {
            primaryDisplay.style.fontSize = "2.75rem";
        } else if (textLength <= 10) {
            primaryDisplay.style.fontSize = "2.2rem";
        } else if (textLength <= 14) {
            primaryDisplay.style.fontSize = "1.75rem";
        } else {
            primaryDisplay.style.fontSize = "1.3rem";
        }
    }

    /**
     * Renders variables onto the primary and secondary displays.
     */
    function updateDisplay() {
        // Format expression for secondary screen (e.g. translating * -> ×, / -> ÷)
        let formattedExpr = expression.map(token => {
            if (token === '*') return '×';
            if (token === '/') return '÷';
            if (token === '-') return '−';
            return token;
        }).join(" ");

        expressionDisplay.textContent = formattedExpr;
        
        // Show current input, replacing minus hyphen with a professional mathematical minus glyph
        let displayVal = currentInput;
        if (displayVal.startsWith("-")) {
            displayVal = "−" + displayVal.slice(1);
        }
        primaryDisplay.textContent = displayVal;
        
        autoscaleDisplayFont();
    }

    /* ==========================================================================
       Calculator Math Engine (No eval() used for security & efficiency)
       ========================================================================== */
    /**
     * Solves basic operator operations.
     */
    function operate(a, operator, b) {
        switch (operator) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': 
                if (b === 0) return "Error";
                return a / b;
            default: return b;
        }
    }

    /**
     * Evaluates a mathematical infix expression array following DMAS precedence order.
     * E.g. [3, "+", 5, "*", 2] -> 13
     */
    function evaluateExpression(tokens) {
        if (tokens.length === 0) return 0;
        
        // Handle trailing operator gracefully (remove it)
        let cleanTokens = [...tokens];
        const lastToken = cleanTokens[cleanTokens.length - 1];
        if (typeof lastToken === 'string' && ['+', '-', '*', '/'].includes(lastToken)) {
            cleanTokens.pop();
        }
        
        if (cleanTokens.length === 0) return 0;

        // Step 1: Evaluate Multiplication and Division first
        let i = 0;
        while (i < cleanTokens.length) {
            const token = cleanTokens[i];
            if (token === '*' || token === '/') {
                const prevNum = cleanTokens[i - 1];
                const nextNum = cleanTokens[i + 1];
                
                if (nextNum === undefined) {
                    cleanTokens.splice(i - 1, 2); // remove operator and left operand
                    i--;
                    continue;
                }

                const result = operate(prevNum, token, nextNum);
                if (result === "Error") return "Error: Division by zero";

                // Replace the three elements (operand, operator, operand) with the single result
                cleanTokens.splice(i - 1, 3, result);
                i--; // Step back to adjust for modified array size
            } else {
                i++;
            }
        }

        // Step 2: Evaluate Addition and Subtraction
        i = 0;
        while (i < cleanTokens.length) {
            const token = cleanTokens[i];
            if (token === '+' || token === '-') {
                const prevNum = cleanTokens[i - 1];
                const nextNum = cleanTokens[i + 1];

                if (nextNum === undefined) {
                    cleanTokens.splice(i - 1, 2);
                    i--;
                    continue;
                }

                const result = operate(prevNum, token, nextNum);
                cleanTokens.splice(i - 1, 3, result);
                i--;
            } else {
                i++;
            }
        }

        // Clean up floating point precision issues (e.g. 0.1 + 0.2)
        const finalVal = cleanTokens[0];
        if (typeof finalVal === 'number') {
            return parseFloat(finalVal.toFixed(10));
        }
        return finalVal;
    }

    /* ==========================================================================
       Calculator Actions Orchestrator
       ========================================================================== */
    /**
     * Main action dispatcher covering operands, operators, clears, and formatting.
     */
    function handleAction(type, value) {
        playClickSound();
        triggerHaptics();

        switch (type) {
            case "number":
                if (currentInput === "0" || isResultDisplay) {
                    currentInput = value;
                    isResultDisplay = false;
                } else if (currentInput === "Error: Division by zero") {
                    currentInput = value;
                } else {
                    currentInput += value;
                }
                break;

            case "decimal":
                if (isResultDisplay) {
                    currentInput = "0.";
                    isResultDisplay = false;
                } else if (!currentInput.includes(".")) {
                    if (currentInput === "" || currentInput === "Error: Division by zero") {
                        currentInput = "0.";
                    } else {
                        currentInput += ".";
                    }
                }
                break;

            case "operator":
                if (currentInput === "Error: Division by zero") break;

                if (currentInput !== "") {
                    // Push operand first, then push operator
                    expression.push(parseFloat(currentInput));
                    expression.push(value);
                    currentInput = "";
                } else if (expression.length > 0) {
                    // Replace consecutive operator with latest selected
                    expression[expression.length - 1] = value;
                } else {
                    // If starting expression directly with operator, assume 0 as left operand
                    expression.push(0);
                    expression.push(value);
                }
                isResultDisplay = false;
                break;

            case "percent":
                if (currentInput !== "" && currentInput !== "Error: Division by zero") {
                    let parsedVal = parseFloat(currentInput);
                    if (expression.length >= 2) {
                        const operator = expression[expression.length - 1];
                        if (operator === '+' || operator === '-') {
                            const valA = evaluateExpression(expression.slice(0, -1));
                            if (typeof valA === 'number' && isFinite(valA)) {
                                const percentVal = (valA * parsedVal) / 100;
                                currentInput = parseFloat(percentVal.toFixed(10)).toString();
                            } else {
                                const percentVal = parsedVal / 100;
                                currentInput = parseFloat(percentVal.toFixed(10)).toString();
                            }
                        } else {
                            const percentVal = parsedVal / 100;
                            currentInput = parseFloat(percentVal.toFixed(10)).toString();
                        }
                    } else {
                        const percentVal = parsedVal / 100;
                        currentInput = parseFloat(percentVal.toFixed(10)).toString();
                    }
                    isResultDisplay = false;
                }
                break;

            case "toggle-sign":
                if (currentInput !== "" && currentInput !== "0" && currentInput !== "Error: Division by zero") {
                    if (currentInput.startsWith("-")) {
                        currentInput = currentInput.slice(1);
                    } else {
                        currentInput = "-" + currentInput;
                    }
                }
                break;

            case "backspace":
                if (isResultDisplay) {
                    // Backspace clears result screen completely
                    currentInput = "0";
                    isResultDisplay = false;
                } else if (currentInput.length > 0 && currentInput !== "0") {
                    currentInput = currentInput.slice(0, -1);
                    if (currentInput === "" || currentInput === "-") {
                        currentInput = "0";
                    }
                } else if (expression.length > 0) {
                    // Pop operator, and convert the previous number back to editable currentInput
                    expression.pop(); // Remove operator
                    const prevNum = expression.pop(); // Remove number
                    if (prevNum !== undefined) {
                        currentInput = prevNum.toString();
                    }
                }
                break;

            case "clear":
                currentInput = "0";
                expression = [];
                isResultDisplay = false;
                break;

            case "equals":
                if (currentInput !== "" && currentInput !== "Error: Division by zero") {
                    expression.push(parseFloat(currentInput));
                }

                if (expression.length > 0) {
                    // Calculate equation result
                    const result = evaluateExpression(expression);
                    
                    // Display text pulse animation for premium feedback
                    primaryDisplay.classList.remove("pulse-animate");
                    void primaryDisplay.offsetWidth; // Trigger reflow to restart animation
                    primaryDisplay.classList.add("pulse-animate");

                    // Build string representation of calculation
                    const mathString = expression.map(token => {
                        if (token === '*') return '×';
                        if (token === '/') return '÷';
                        if (token === '-') return '−';
                        return token;
                    }).join(" ");

                    if (result === "Error: Division by zero") {
                        currentInput = "Error: Division by zero";
                        expression = [];
                        isResultDisplay = true;
                    } else {
                        // Success calculation
                        const roundedResult = result.toString();
                        currentInput = roundedResult;
                        
                        // Save calculation log to history panel
                        addHistoryItem(mathString, roundedResult);
                        expression = [];
                        isResultDisplay = true;
                    }
                }
                break;
        }

        updateDisplay();
    }

    /* ==========================================================================
       History Management
       ========================================================================== */
    function initHistory() {
        const storedHistory = localStorage.getItem("calc_history");
        if (storedHistory) {
            history = JSON.parse(storedHistory);
            renderHistoryList();
        }
    }

    function addHistoryItem(expr, result) {
        history.unshift({ expr, result });
        // Keep maximum 50 history entries
        if (history.length > 50) {
            history.pop();
        }
        localStorage.setItem("calc_history", JSON.stringify(history));
        renderHistoryList();
    }

    function renderHistoryList() {
        if (history.length === 0) {
            historyList.innerHTML = `<div class="history-empty">No history yet</div>`;
            return;
        }

        historyList.innerHTML = history.map((item, index) => `
            <div class="history-item" data-index="${index}" tabindex="0" role="button" aria-label="Use calculation: ${item.expr} equals ${item.result}">
                <div class="history-item-expr">${item.expr} =</div>
                <div class="history-item-result">${item.result}</div>
            </div>
        `).join("");

        // Attach listeners to items to load them back
        const items = historyList.querySelectorAll(".history-item");
        items.forEach(item => {
            item.addEventListener("click", () => {
                const index = parseInt(item.getAttribute("data-index"));
                const selected = history[index];
                currentInput = selected.result;
                expression = [];
                isResultDisplay = true;
                updateDisplay();
                closeHistoryPanel();
                playClickSound();
            });

            item.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    item.click();
                }
            });
        });
    }

    function clearHistory() {
        history = [];
        localStorage.removeItem("calc_history");
        renderHistoryList();
        playClickSound();
    }

    function openHistoryPanel() {
        historyPanel.classList.add("open");
        historyPanel.setAttribute("aria-hidden", "false");
        closeHistory.focus();
    }

    function closeHistoryPanel() {
        historyPanel.classList.remove("open");
        historyPanel.setAttribute("aria-hidden", "true");
        historyToggle.focus();
    }

    /* ==========================================================================
       Theme Configuration
       ========================================================================== */
    function initTheme() {
        const storedTheme = localStorage.getItem("calc_theme");
        if (storedTheme === "light") {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            themeToggle.setAttribute("aria-label", "Switch to dark theme");
            moonIcon.style.display = "none";
            sunIcon.style.display = "block";
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            themeToggle.setAttribute("aria-label", "Switch to light theme");
            moonIcon.style.display = "block";
            sunIcon.style.display = "none";
        }
    }

    function toggleTheme() {
        playClickSound();
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            localStorage.setItem("calc_theme", "light");
            themeToggle.setAttribute("aria-label", "Switch to dark theme");
            moonIcon.style.display = "none";
            sunIcon.style.display = "block";
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            localStorage.setItem("calc_theme", "dark");
            themeToggle.setAttribute("aria-label", "Switch to light theme");
            moonIcon.style.display = "block";
            sunIcon.style.display = "none";
        }
    }

    /* ==========================================================================
       Sound Configuration
       ========================================================================== */
    function initSound() {
        const storedSound = localStorage.getItem("calc_sound");
        if (storedSound === "false") {
            soundEnabled = false;
            soundOnIcon.style.display = "none";
            soundOffIcon.style.display = "block";
        } else {
            soundEnabled = true;
            soundOnIcon.style.display = "block";
            soundOffIcon.style.display = "none";
        }
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem("calc_sound", soundEnabled.toString());
        if (soundEnabled) {
            soundOnIcon.style.display = "block";
            soundOffIcon.style.display = "none";
            // Play test click sound to confirm reactivation
            playClickSound();
        } else {
            soundOnIcon.style.display = "none";
            soundOffIcon.style.display = "block";
        }
    }

    /* ==========================================================================
       Event Listeners (Clicks & Grid Interface)
       ========================================================================== */
    keypad.addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (!button) return;

        // Perform visual ripple feedback
        button.classList.add("triggered");
        setTimeout(() => button.classList.remove("triggered"), 300);

        const dataNum = button.getAttribute("data-number");
        const dataOperator = button.getAttribute("data-operator");
        const dataAction = button.getAttribute("data-action");

        if (dataNum !== null) {
            handleAction("number", dataNum);
        } else if (dataOperator !== null) {
            handleAction("operator", dataOperator);
        } else if (dataAction !== null) {
            handleAction(dataAction, null);
        }
    });

    // Theme Toggle click
    themeToggle.addEventListener("click", toggleTheme);

    // Sound Toggle click
    soundToggle.addEventListener("click", toggleSound);

    // History Panel handlers
    historyToggle.addEventListener("click", () => {
        playClickSound();
        openHistoryPanel();
    });
    closeHistory.addEventListener("click", () => {
        playClickSound();
        closeHistoryPanel();
    });
    clearHistoryBtn.addEventListener("click", clearHistory);

    /* ==========================================================================
       Keyboard Support & Shortcuts
       ========================================================================== */
    const KEY_MAP = {
        '0': 'key-0',
        '1': 'key-1',
        '2': 'key-2',
        '3': 'key-3',
        '4': 'key-4',
        '5': 'key-5',
        '6': 'key-6',
        '7': 'key-7',
        '8': 'key-8',
        '9': 'key-9',
        '.': 'key-decimal',
        '+': 'key-add',
        '-': 'key-subtract',
        '*': 'key-multiply',
        'x': 'key-multiply',
        'X': 'key-multiply',
        '/': 'key-divide',
        '%': 'key-percent',
        'Enter': 'key-equals',
        '=': 'key-equals',
        'Backspace': 'key-backspace',
        'Escape': 'key-clear',
        'c': 'key-clear',
        'C': 'key-clear'
    };

    document.addEventListener("keydown", (e) => {
        // Ignore key inputs if focus is inside history container inputs or scroll lists
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        const buttonId = KEY_MAP[e.key];
        if (buttonId) {
            e.preventDefault(); // Prevent page scrolls or default actions
            const buttonElement = document.getElementById(buttonId);
            if (buttonElement) {
                // Add keyboard visual click feedback
                buttonElement.classList.add("keyboard-active", "triggered");
                
                // Trigger button click programmatically
                buttonElement.click();

                // Clean up animation classes
                setTimeout(() => {
                    buttonElement.classList.remove("keyboard-active", "triggered");
                }, 150);
            }
        }
    });
});