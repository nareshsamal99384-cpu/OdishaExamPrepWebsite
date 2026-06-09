---
name: efficient-development-and-dark-ui
description: Elite development guidelines for ClinicFlow to minimize token consumption through precise file edits, while implementing pixel-perfect dark-themed native input elements and seamless picker UX.
license: Complete terms in LICENSE.txt
---

# Efficient Development & Dark UI Best Practices

This skill file documents the engineering patterns and optimization workflows used to build ClinicFlow efficiently, focusing on low credit/token consumption and superior UI/UX for native dark-mode browser inputs.

---

## 1. Credit-Conscious Coding & File Editing Techniques

When modifying files in this codebase, the way changes are applied has a direct impact on performance, token overhead, and billing credits. Adhere to the following rules:

### A. Prefer Precise Replacements
* **Always use chunk-based edits**: Utilize `replace_file_content` (for contiguous blocks) or `multi_replace_file_content` (for non-contiguous edits) instead of replacing the entire file.
* **Keep target ranges minimal**: The search and replacement chunks should target only the exact lines of code that need changing. This keeps the network payload extremely small and fast.

### B. Avoid Full Overwrites
* **Do not use `write_to_file` to edit existing files**: The `write_to_file` tool transmits the entire file content, which is highly expensive for large components.
* **Use `write_to_file` only for creating NEW files** (such as new utilities, components, or skill files).

---

## 2. Professional Dark Theme Support for Native Browser Elements

A common issue in modern web applications is that standard HTML5 inputs (`type="date"`, `type="time"`, `type="select"`) default to a light-mode styling, resulting in black, unreadable icons inside dark inputs and light native dropdown menus.

Apply this professional system setup to ensure a cohesive, unified dark UI:

### A. Declare the Application's Color Scheme
Always declare `color-scheme: dark;` on the root stylesheet of the application to inform the browser that the website is dark-themed.
```css
:root {
  color-scheme: dark;
}
```
* **Why it matters**: This immediately forces the native browser date-pickers, time-selectors, native option menus, and scrollbars to render with high-contrast text, borders, and matching dark backdrops automatically.

### B. Custom Styled Webkit Indicators
To make native indicators match ClinicFlow's custom teal color scheme instead of browser-default gray/white:
```css
/* Custom teal filter and micro-interactions for native picker indicators */
input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  /* Elegant bright teal filter (#2dd4bf) */
  filter: invert(72%) sepia(35%) saturate(834%) hue-rotate(124deg) brightness(97%) contrast(89%);
  cursor: pointer;
  border-radius: 6px;
  padding: 4px;
  margin-right: -2px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

input[type="date"]::-webkit-calendar-picker-indicator:hover,
input[type="time"]::-webkit-calendar-picker-indicator:hover {
  background: rgba(45, 212, 191, 0.15); /* Subtle teal glow */
  transform: scale(1.15); /* Responsive micro-scale */
  filter: invert(85%) sepia(45%) saturate(1000%) hue-rotate(124deg) brightness(100%) contrast(100%); /* Brighter teal hover */
}
```

---

## 3. Seamless Picker UX (`showPicker`)

To provide an elite, touch-friendly, and highly intuitive user experience, users should not be forced to click precisely on the small icon on the right to trigger the picker.

### A. Entire-Input Clickability
Always add `onClick` triggers calling the HTML5 `showPicker()` API on native date and time input elements in React/JavaScript.
```tsx
<input 
  type="date" 
  value={value} 
  onChange={onChange}
  onClick={(e) => {
    try {
      e.currentTarget.showPicker();
    } catch (err) {
      console.warn("Native picker not supported:", err);
    }
  }}
  className="cursor-pointer"
/>
```
* **Why it matters**: Calling `showPicker()` programmatically triggers the native browser popover when the user clicks *anywhere* within the large boundaries of the input field. The `try/catch` wrapper ensures complete cross-browser safety.
