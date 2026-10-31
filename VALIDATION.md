# Validation — 31 October 2026

- Node.js 24.22.1 used for verification; application requires Node 22+.
- 18 offline tests passed: printer state/actions, single-use spoken confirmations,
  expiry and state changes, fan/temperature limits, homing restrictions,
  negation/compound rejection, exact status answers, duplicate turns,
  read-only real-printer mode, consent enforcement and redacted provider errors.
  Server tests cover public-asset allowlisting, key-value nondisclosure and CSRF.
- JavaScript syntax checks passed for the server, provider/printer/conversation
  modules, main browser UI and voice component.
- Voice component reuses the working browser code from the Python version.
  Its wake/confirmation/chime state behavior was checked with browser mocks in
  the earlier build. A real AI Studio microphone, iframe policy and autoplay
  test has not been performed.
- No authenticated Google/ElevenLabs calls, AI Studio import/deployment or real
  Moonraker connection was made. Account access, voice entitlement and networking
  need verification on the user's account.
- The HTTP handler was tested in-process without opening a server socket.
- The ZIP has an explicit file allowlist and includes no actual `.env`, keys,
  recordings, node_modules, Python environment or generated cache files.
- No third-party npm dependency download is required. No performance benchmark
  against live providers was made. Timings in the UI report actual calls when run.
