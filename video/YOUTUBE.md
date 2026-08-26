# AgentGate demo — YouTube upload

- URL: https://youtu.be/EmpHneJSSlw
- Video ID: EmpHneJSSlw (extracted from DOM share-dialog link, `a[href*="youtu.be"]`, not transcribed from a screenshot)
- Channel: run run (@runrun-s7o) — https://www.youtube.com/@runrun-s7o
- Visibility: Public
- Title: AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo)
- Description:
  AgentGate is a zero-dependency protocol layer on top of WebMCP (document.modelContext.registerTool) that adds describe_page, structured receipts, risk tiers, request_human (human-in-the-loop for irreversible actions) and ready gating. Built for The WebMCP Challenge 2026 (OpenAI × Devpost). Live demo: https://run58669-maker.github.io/agentgate-webmcp/  Code (MIT): https://github.com/run58669-maker/agentgate-webmcp
- Audience: Not made for kids (不，内容不是面向儿童的)
- Uploaded via: CDP port 9222 ("run run" account, run58669@gmail.com), YouTube Studio upload dialog, DOM.setFileInputFiles for the video attach.
- Published: 2026-08-26 (per Studio's own "发布于 2026年8月26日" share dialog)

## External verification (oEmbed)

Command:
```
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=EmpHneJSSlw&format=json"
```

Response:
```json
{"title":"AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo)","author_name":"run run","author_url":"https://www.youtube.com/@runrun-s7o","type":"video","height":150,"width":200,"version":"1.0","provider_name":"YouTube","provider_url":"https://www.youtube.com/","thumbnail_height":360,"thumbnail_width":480,"thumbnail_url":"https://i.ytimg.com/vi/EmpHneJSSlw/hqdefault.jpg","html":"<iframe width="200" height="150" src="https://www.youtube.com/embed/EmpHneJSSlw?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo)"></iframe>"}
```

Timestamp of this verification: 2026-08-26 (session run, CDP port 9222).

## Notes / earlier blockers (resolved)

- First attempt was on CDP port 9223 ("R" browser): only Google account signed in there (QQQ Q / qq4108609@gmail.com) has no YouTube channel. Stopped without creating a channel, closed the tab, reported back.
- Coordinator confirmed the correct channel ("run run") is actually signed in on CDP port **9222**, not 9223. Redid the whole upload there per updated instructions. No accounts were added/switched/logged in/out; only pre-existing sessions were used.
