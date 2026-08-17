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
- Task list with add, rename (double-click), complete, delete, and clear-completed
- Mark a task "active" to tally completed pomodoros against it
- Daily stats: sessions today, minutes focused, and a day-streak indicator
- Mute toggle for the completion chime
- Keyboard shortcuts: `Space` start/pause, `R` reset, `S` skip, `N` new task
- Accessible: focus-visible outlines, aria-live session announcements
- State persisted to `localStorage`, with a one-click "Reset all data"
