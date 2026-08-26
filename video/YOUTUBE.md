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

---

# v3 upload — live-agent demo (2:34)

- URL: https://youtu.be/KyUvS32f3Fs
- Video ID: KyUvS32f3Fs (extracted from DOM share-dialog link, `a[href*="youtu.be"]`, not transcribed from a screenshot)
- Channel: run run (@runrun-s7o) — https://www.youtube.com/@runrun-s7o
- Visibility: Public
- Title: AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo, v3: live agent)
- Description:
  AgentGate is a zero-dependency protocol layer on top of WebMCP (document.modelContext.registerTool) that adds describe_page, structured receipts with field-level errors, risk tiers, request_human (human-in-the-loop for irreversible actions) and ready gating. In this video every tool call in the 'after' segment is made live by an AI agent (Claude) over the Chrome DevTools Protocol, choosing each step from the previous receipt. Built for The WebMCP Challenge 2026 (OpenAI × Devpost). Live demo: https://run58669-maker.github.io/agentgate-webmcp/  Code (MIT): https://github.com/run58669-maker/agentgate-webmcp
- Audience: Not made for kids (不，内容不是面向儿童的)
- Source file: agentgate_demo.mp4 (2:34), confirmed via the Details-step video player duration matching before publish.
- Uploaded via: CDP port 9222 ("run run" account), plain `websocket.create_connection` to a tab opened with `PUT /json/new?https://www.youtube.com/upload`. Elements located with a JS shadow-DOM-piercing `deepQueryAll` helper (Runtime.evaluate); clicks via real `Input.dispatchMouseEvent` at each element's `DOM.getBoxModel` center; title/description typed via `Input.insertText` after a real click-to-focus; the video file attached with `DOM.setFileInputFiles` on the shadow-nested `input[type=file]`. Tab closed via `GET /json/close/<id>` in a finally step after verification; no other tabs touched, ports 9223–9227 untouched.
- Published: 2026-08-26 (per Studio's own "发布于 2026年8月26日" share dialog)
- Old video EmpHneJSSlw (v2) was left untouched — not deleted or edited; still listed as a separate Public video in Studio's channel content list.

## External verification (oEmbed)

Command:
```
curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=KyUvS32f3Fs&format=json"
```

Response:
```json
{"title":"AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo, v3: live agent)","author_name":"run run","author_url":"https://www.youtube.com/@runrun-s7o","type":"video","height":150,"width":200,"version":"1.0","provider_name":"YouTube","provider_url":"https://www.youtube.com/","thumbnail_height":360,"thumbnail_width":480,"thumbnail_url":"https://i.ytimg.com/vi/KyUvS32f3Fs/hqdefault.jpg","html":"<iframe width=\"200\" height=\"150\" src=\"https://www.youtube.com/embed/KyUvS32f3Fs?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"AgentGate — make your web page talk to agents (WebMCP Challenge 2026 demo, v3: live agent)\"></iframe>"}
```

Timestamp of this verification: 2026-08-26 (session run, CDP port 9222).
