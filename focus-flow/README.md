# Focus Flow

A minimalist Pomodoro timer with a task list, keyboard shortcuts, and an animated progress ring. No build step, no dependencies — just static HTML/CSS/JS.

## Run it

Open `index.html` directly in a browser, or serve the folder:

```bash
python -m http.server 8420 --directory focus-flow
```

Then visit `http://localhost:8420`.

## Features

- Focus / short break / long break timer with an animated SVG ring
- Task list with add, complete, and delete
- Keyboard shortcuts: `Space` start/pause, `R` reset, `S` skip, `N` new task
- State persisted to `localStorage`
