# Demo video build report — 2026-08-26

## Output

`video/agentgate_demo.mp4` — 1280x800, H.264/AAC, 30fps, 143.73s (2:23.7), well under the 2:50
budget.

### ffprobe (full)

```
[STREAM]
index=0
codec_name=h264
codec_long_name=H.264 / AVC / MPEG-4 AVC / MPEG-4 part 10
profile=High
codec_type=video
width=1280
height=800
pix_fmt=yuv420p
r_frame_rate=30/1
avg_frame_rate=30/1
duration=143.733333
bit_rate=82009
nb_frames=4312

[STREAM]
index=1
codec_name=aac
codec_long_name=AAC (Advanced Audio Coding)
profile=LC
codec_type=audio
sample_fmt=fltp
sample_rate=44100
channels=2
channel_layout=stereo
duration=143.710612
bit_rate=122664
nb_frames=6187

[FORMAT]
format_name=mov,mp4,m4a,3gp,3g2,mj2
duration=143.733333
size=3834375
bit_rate=213416
probe_score=100
```

### Audio sanity check (`ffmpeg -af volumedetect -f null -`)

```
mean_volume: -23.8 dB
max_volume: -5.2 dB
```

Non-silent, non-clipping — narration is present and audible for the full runtime.

## How it was built

1. **Footage**: isolated Chrome (`--user-data-dir` in scratch, `--remote-debugging-port=9226`,
   `--enable-features=WebMCP,WebMCPTesting --enable-blink-features=WebMCP`) driven over raw CDP
   (Python `websocket-client`) against the live URL
   `https://run58669-maker.github.io/agentgate-webmcp/`. Ports 9222/9223/9224 (the user's own
   Chrome instances) were never touched; the isolated Chrome process was killed at the end.
   - `?agentgate=off` flow: 14 real screenshots (account -> profile -> radio interaction -> upload
     -> review -> submit toast), driven with real `Input.dispatchMouseEvent` mouse clicks and
     `Input.insertText`, `DOM.setFileInputFiles` for the upload.
   - AgentGate-on flow: 13 real screenshots driving the Agent console buttons 1-10 in order,
     including the real `request_human` confirmation panel and clicking its actual `[data-agentgate-confirm]`
     Confirm button, and the token-gated `submit_application` success receipt (with the real minted
     token visible in the JSON log).
   - `document.modelContext.getTools()` was called for real (it returns a Promise; awaited via
     `Runtime.evaluate` with `awaitPromise:true`) and returned the genuine 8 tools with real
     `[risk:...]`-tagged descriptions — captured to `frames_after/tools_after_ready.json`. Same
     call on the `?agentgate=off` page returns 0 tools registered, confirmed with `Array.isArray`/
     `JSON.stringify` checks.
2. **Narration**: Windows `System.Speech` (`Microsoft Zira Desktop`, en-US, Rate=1) generated one
   WAV per section from the exact text in `video/NARRATION.md`. Measured durations:
   title 3.96s, before 40.48s, after 60.14s, protocol 22.80s, integration 13.58s (~141s total).
3. **Assembly**: each screenshot became its own short H.264 clip (`ffmpeg -loop 1 -t <dur>`) with a
   burned-in caption (`drawtext`, `C:/Windows/Fonts/arial.ttf`, escaped drive-colon), held for a
   duration proportional to its narrative weight so the section's total matches its narration
   length (+0.5s tail buffer). Title/Protocol/Integration cards were rendered as 1280x800 PNGs with
   Pillow, then treated the same way. Per-section clips were concatenated (`-f concat`), muxed with
   their narration WAV (`apad` + `-shortest` so trailing silence pads exactly to video length), and
   the five final sections concatenated into `video/agentgate_demo.mp4`.
4. Scripts used (`cdp.py`, `capture_before.py`, `capture_after.py`, `gen_cards.py`,
   `build_video.py`) lived in the session scratch dir, not committed (throwaway build tooling, not
   part of the shippable repo).

## Honesty note: the "click the radio input directly does nothing" bug

The brief (and the demo app's own source comments) describe the bare-DOM organization-type radio
as: clicking the `<input>` directly does nothing because it's `pointer-events:none`; only clicking
the `<label>` text works. I tested this directly before filming it (`document.elementFromPoint()`
at the input's exact bounding-box center, plus calling `.click()` on the input node itself) and
found it does **not** reproduce that way: because the `<label>` wraps the `<input>` and the input
has `pointer-events:none`, a real coordinate click *or* a direct `.click()` call on the input both
resolve to the label (native label-forwards-to-control behavior + event bubbling), so the radio
gets selected either way. The genuinely verified, reproducible bug is that the input has
`tabindex="-1"` (unreachable via keyboard/Tab) and carries no `change` listener of its own in
`?agentgate=off` mode — all real interactivity lives on the label. So the "before" segment's
captions/narration say "the input itself gives a script no signal" (true — no listener on that
node) rather than claiming the click visibly fails (which I could not reproduce and did not want
to fake). The stronger, unambiguous "before" contrasts kept in the video are: zero WebMCP tools
registered, no structured ready signal on load, and a plain-text-toast submit with no receipt —
all independently verified live against the deployed site.

## Files

- `video/agentgate_demo.mp4` — final output.
- `video/NARRATION.md` — exact narration text + per-section WAV durations.
- `video/SCRIPT.md` — original script (unchanged).
- `video/frames/before/`, `video/frames/after/` — the raw captured screenshots + manifests, kept
  locally for reference (gitignored via `video/frames/`, not committed).
