# Demo video build report — 2026-08-26

## Revision 2 (post-review fixes)

Coordinator review of revision 1 flagged two issues, both fixed and re-rendered to the same path
(`video/agentgate_demo.mp4`, overwritten):

1. **Chinese browser chrome in the file input.** The first capture's isolated Chrome inherited the
   system locale, so the bare-DOM upload step showed "选择文件 / 未选择任何文件" instead of
   "Choose File / No file chosen". Fixed by relaunching the isolated Chrome with
   `--lang=en-US --accept-lang=en-US` (verified `navigator.language` / `navigator.languages` ===
   `en-US` before recapturing) and re-running both capture scripts end to end against the live
   site, so every screenshot in this revision — not just the upload step — is from the English
   session.
2. **Burned captions overlapping page content.** The v1 caption bar sat over the bottom of the
   screenshot itself, and at points where the on-page content (e.g. the Agent console's JSON log)
   extended low enough, the caption covered it. Fixed with letterbox option (a): every frame is
   padded from the captured 1280x800 into a 1280x880 canvas with an 80px solid-black band appended
   below the page content, and captions are drawn centered inside that band only (`y` computed
   from `H=800` + half the 80px band, never inside `[0,800)`). The five static cards
   (title/protocol/integration use the same 1280x880 canvas so concat has matching dimensions;
   they already carry their own on-image text so they don't use the caption band. Re-verified by
   extracting frames at the exact beats that previously overlapped (submit-blocked HUMAN_REQUIRED,
   upload NOT_READY, final submit success) — caption band is clean in all of them, console JSON
   fully visible above it.

## Output

`video/agentgate_demo.mp4` — **1280x880** (1280x800 page + 80px caption band), H.264/AAC, 30fps,
143.73s (2:23.7), well under the 2:50 budget. (Total runtime is unchanged from revision 1 — only
resolution and caption placement changed.)

### ffprobe (full, revision 2)

```
[STREAM]
index=0
codec_name=h264
profile=High
codec_type=video
width=1280
height=880
pix_fmt=yuv420p
r_frame_rate=30/1
avg_frame_rate=30/1
duration=143.733333
bit_rate=86040
nb_frames=4312

[STREAM]
index=1
codec_name=aac
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
size=3906787
bit_rate=217446
probe_score=100
```

### Audio sanity check (`ffmpeg -af volumedetect -f null -`)

```
Duration: 00:02:23.73
mean_volume: -23.8 dB
max_volume: -5.2 dB
```

Non-silent, non-clipping — narration is present and audible for the full runtime, unchanged from
revision 1 (same WAVs, only the video canvas/caption placement changed).

## How it was built

1. **Footage**: isolated Chrome (`--user-data-dir` in scratch, `--remote-debugging-port=9226`,
   `--lang=en-US --accept-lang=en-US`, `--enable-features=WebMCP,WebMCPTesting
   --enable-blink-features=WebMCP`) driven over raw CDP (Python `websocket-client`) against the
   live URL `https://run58669-maker.github.io/agentgate-webmcp/`. Ports 9222/9223/9224 (the user's
   own Chrome instances) were never touched; the isolated Chrome process was killed and its tabs
   closed at the end of each capture pass.
   - `?agentgate=off` flow: 14 real screenshots (account -> profile -> radio interaction -> upload
     -> review -> submit toast), driven with real `Input.dispatchMouseEvent` mouse clicks and
     `Input.insertText`, `DOM.setFileInputFiles` for the upload. File-input chrome now renders in
     English ("Choose File / No file chosen").
   - AgentGate-on flow: 13 real screenshots driving the Agent console buttons 1-10 in order,
     including the real `request_human` confirmation panel and clicking its actual
     `[data-agentgate-confirm]` Confirm button, and the token-gated `submit_application` success
     receipt (with the real minted token visible in the JSON log).
   - `document.modelContext.getTools()` was called for real (it returns a Promise; awaited via
     `Runtime.evaluate` with `awaitPromise:true`) and returned the genuine 8 tools with real
     `[risk:...]`-tagged descriptions — captured to `frames_after/tools_after_ready.json`. Same
     call on the `?agentgate=off` page returns 0 tools registered, confirmed with `Array.isArray`/
     `JSON.stringify` checks.
2. **Narration**: Windows `System.Speech` (`Microsoft Zira Desktop`, en-US, Rate=1) generated one
   WAV per section from the exact text in `video/NARRATION.md`. Measured durations:
   title 3.96s, before 40.48s, after 60.14s, protocol 22.80s, integration 13.58s (~141s total).
   Unchanged in revision 2.
3. **Assembly**: each screenshot is scaled to 1280x800 then padded to 1280x880 with an 80px black
   band appended below (`pad=1280:880:0:0:black`), and a caption is drawn centered inside that band
   (`drawtext`, `C:/Windows/Fonts/arial.ttf`, escaped drive-colon, fontsize 28, no box needed since
   the band itself is solid) — held for a duration proportional to its narrative weight so the
   section's total matches its narration length (+0.5s tail buffer). Title/Protocol/Integration
   cards are 1280x800 PNGs (Pillow) padded the same way to 1280x880 for matching concat dimensions.
   Per-section clips are concatenated (`-f concat`), muxed with their narration WAV (`apad` +
   `-shortest` so trailing silence pads exactly to video length), and the five final sections
   concatenated into `video/agentgate_demo.mp4`.
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

- `video/agentgate_demo.mp4` — final output (revision 2).
- `video/NARRATION.md` — exact narration text + per-section WAV durations.
- `video/SCRIPT.md` — original script (unchanged).
- `video/frames/before/`, `video/frames/after/` — the raw captured screenshots (English-locale
  recapture) + manifests, kept locally for reference (gitignored via `video/frames/`, not
  committed).
