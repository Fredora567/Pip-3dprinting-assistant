# Pip — AI Studio edition

Complete Node.js/browser port of the Pip Klipper voice companion. English-only
ElevenLabs speech input/output, Gemma 4 answers, local wake-name detection,
original animated character, simulated printer and spoken action confirmations.

**Finnish import instructions: [ALOITA_AI_STUDIOSSA.md](ALOITA_AI_STUDIOSSA.md).**
**Build import prompt: [AI_STUDIO_PROMPT.txt](AI_STUDIO_PROMPT.txt).**

## Runtime

Node.js 22 or later, no external npm dependencies, no Python environment.
HTML/CSS/JavaScript frontend and Node REST backend use a single port. AI Studio
defaults to React, but supports the Node full-stack runtime used here. This is
a prepared source import, not a completed deployment into your account.

For local use, copy `.env.example` to `.env` once and enter private keys there.
On AI Studio, configure the same names in server Secrets. Never overwrite a
working `.env` when applying updates. From the project root:

```text
npm run dev
```

Open `http://localhost:3000`. No `npm install` is required because this package
uses only Node built-ins. `npm run build` checks server and frontend JavaScript
syntax; it is not a bundler. `npm test` runs deterministic mocked tests.

## Included behavior

- Start/Stop microphone, wake detector requiring on-device English support,
  phonetic Pip/peep matching, chimes, local diagnostics and reduced motion.
- Turn-based recording → ElevenLabs Scribe → direct status or hosted Gemma →
  ElevenLabs Flash voice → audio playback → next turn.
- Explicit cloud permission. Typed status questions work without keys or consent.
- English language hint and refusal when transcription reports another language;
  language detection and model behavior can still make mistakes.
- Short answers and exact-match direct status responses avoid unnecessary LLM
  calls. Timing panel shows server stages. Audio is buffered, not streamed.
- Pause/resume/cancel, fan 0–100%, heater targets off, home X/Y/Z/all, and bounded
  simulated temperature targets (nozzle 0–280 °C, bed 0–110 °C).
- Homing is blocked during active/paused prints. Actions require an exact
  confirm/cancel turn bound to a single-use token, current job/state and expiry.
  These simulation temperature bounds are not advice for a real printer.
- Local read-only Moonraker queries are optional. Hosted preview cannot normally
  access a home LAN. No real control endpoint or arbitrary G-code is implemented.
- No Home Assistant/camera integration, as requested.

## Secrets and access

`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `GEMMA_MODEL`,
`ELEVENLABS_STT_MODEL` and `ELEVENLABS_TTS_MODEL` are read on the server only.
Defaults are documented in `.env.example`. Keys are sent in HTTPS headers,
never in URLs. Error output uses safe categories rather than arbitrary provider
messages or headers. The server statically serves only five allowlisted public
assets, never `.env`, provider source or this repository's other files.

Each browser session gets its own in-memory printer, pending action, history,
bounded duplicate-ID set and CSRF token. State expires after two hours of
inactivity; the process stores at most 100 sessions. Provider calls time out,
responses are bounded, and no automatic paid retries are made. A server restart
loses sessions. There is no database or application transcript/audio logging.

Set a strong `APP_PASSWORD` before sharing. This provides a shared password gate,
not full identity-based authorization or internet-scale abuse protection. A
simple per-session rate limit is included. Keep the preview private until access
control, deployment limits and spending controls meet your needs. Shared users
consume your provider quota. Keys and recordings are never committed.

## Browser considerations

Microphone requires a secure context (HTTPS or localhost) and user permission.
`metadata.json` requests microphone access in AI Studio. The iframe also requests
microphone/autoplay/on-device recognition, but the outer hosting policy can
still block those features. Local `SpeechRecognition` is experimental. When
unsupported, wake mode stops with a message; explicitly disable wake mode or
type instead. No cloud background wake fallback is used. The audio context is
unlocked on a user click, with a Test chime button and manual playback fallback.
The capture uses ScriptProcessorNode for compatibility; production development
should consider AudioWorklet. Pip cannot interrupt its own spoken replies.

## References

- [AI Studio Build and import](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)
- [Gemma on Gemini API](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
- [ElevenLabs transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert)
- [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [Moonraker](https://moonraker.readthedocs.io/en/latest/external_api/printer/)

Documentation checked 31 October 2026. API/model availability remains account-
dependent. App source is MIT; providers, model weights and voices have separate
terms. Google AI Studio's coding assistant is Gemini; Pip's answering model is
Gemma 4 through the Gemini API. These are separate roles.
