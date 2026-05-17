# **Mycosurge: Brutalist Terminal Design System**

## **1\. Design Philosophy**

The visual identity of Mycosurge is **Clinical Brutalism**. It simulates a raw, unfiltered data terminal used by lab researchers. We avoid "gamey" elements like smooth animations, glowing neon, or rounded corners. Everything is sharp, functional, and purely informational.

- **No Glow:** Remove all text-shadows and box-shadows.
- **No Curves:** border-radius must always be 0\.
- **High Contrast, Low Color:** The UI relies entirely on greyscale. Color is reserved _strictly_ for critical alerts or aggressive biological elements.
- **Instant Feedback:** Hover states and state changes should snap instantly (no CSS transition properties).

## **2\. Color Palette**

The color system uses CSS variables to ensure strict adherence to the monochrome theme.

| Variable Name   | Hex Code | Purpose / Usage                                                                                             |
| :-------------- | :------- | :---------------------------------------------------------------------------------------------------------- |
| \--bg-color     | \#050505 | The absolute background. Almost pure black to reduce eye strain while maintaining a void-like depth.        |
| \--text-main    | \#e0e0e0 | Primary text, active buttons, and standard UI borders. Not pure white, to avoid harsh glare.                |
| \--text-dim     | \#666666 | Secondary text, inactive states, background grid lines, and passive logs.                                   |
| \--border-color | \#333333 | Panel borders and structural dividers.                                                                      |
| \--alert-color  | \#cc3333 | **The only UI color.** Used exclusively for Host immune responses, trauma warnings, and enemy projectiles.  |
| \--accent-color | \#ffffff | Pure white. Used _only_ for the Player Core \[+\] to ensure the player never loses themselves on the radar. |

## **3\. Typography**

- **Primary Font:** JetBrains Mono (Google Fonts)
- **Fallback:** monospace
- **Weights:** 400 (Regular) for logs and data, 700 (Bold) for headers and active actions.

### **Typographic Rules:**

1. **Uppercase Dominance:** All structural UI elements (Buttons, Panel Headers, Labels) must be in UPPERCASE.
2. **Tabular Figures:** Because we use a monospace font, numbers align perfectly in columns. Exploit this for resource tracking.
3. **Data Formatting:** Always format numbers cleanly (e.g., 4,208 µg instead of 4208).

## **4\. UI Components**

### **Panels**

Containers that divide the screen into logical sectors.

- **Border:** 1px solid var(--border-color)
- **Background:** var(--bg-color)
- **Header:** Panel titles sit flush inside the border, often separated by a bottom border or distinguished by a slightly lighter background (\#0a0a0a).

### **Buttons**

Actionable elements must feel like command-line executions.

- **Default State:** Transparent background, 1px solid var(--border-color), var(--text-main) text.
- **Hover/Active State:** **Inverted.** Background becomes var(--text-main) and text becomes var(--bg-color).
- **Prefixes:** Use command-line prefixes to indicate action types (\> EXE:, SYS:, SUDO:).

### **Progress Bars**

Do not use smooth HTML5 progress elements. Use ASCII representations to reinforce the terminal aesthetic.

- **Format:** \[██████░░░░░░░░\]
- **Filled:** █ (U+2588 Full Block)
- **Empty:** ░ (U+2591 Light Shade)

### **Scrollbars**

The default browser scrollbar breaks the immersion. Use a minimal, custom webkit scrollbar.

- **Width:** 6px
- **Track:** var(--bg-color)
- **Thumb:** var(--border-color)

## **5\. Micro-Radar (Canvas) Guidelines**

The active combat phase happens entirely within an HTML5 Canvas, rendered to look like a raw sensor feed.

- **Clear Method:** The canvas must be completely wiped every frame (ctx.fillRect). Do **not** use semi-transparent overlays to create motion blur or trails. It must look sharp and choppy.
- **The Grid:** Render a subtle background grid using dots or 1px intersections of \#111111 spaced every 30px.
- **Entities:**
  - **Player Core:** Rendered purely as the text \[+\] in \#ffffff.
  - **Host Nodes:** Rendered as a character (e.g., H) inside a stroked circle (\#333333 stroke, \#1a1a1a fill).
  - **Antibodies/Enemies:** Rendered purely as text characters (v, x, \*) in \#cc3333.

## **6\. CSS Boilerplate Example**

:root {  
 \--bg-color: \#050505;  
 \--text-main: \#e0e0e0;  
 \--text-dim: \#666666;  
 \--border-color: \#333333;  
 \--alert-color: \#cc3333;  
 \--accent-color: \#ffffff;  
}

body {  
 background-color: var(--bg-color);  
 color: var(--text-main);  
 font-family: 'JetBrains Mono', monospace;  
 /\* ... \*/  
}

/\* Inverted Button Hover \*/  
.btn:hover {  
 background: var(--text-main);  
 color: var(--bg-color);  
 transition: none; /\* Instant snap \*/  
}
