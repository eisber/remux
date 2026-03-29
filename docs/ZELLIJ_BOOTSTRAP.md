# Zellij Bootstrap

This document tracks the short-term Zellij bootstrap path for Remux while the deeper product direction is still undecided.

## Current shape

- GitHub fork: `https://github.com/yaoshenwang/zellij`
- Local source checkout: `vendor/zellij` (git submodule pointing at the fork)
- Stable public entrypoint: `https://zellij.yaoshen.wang/remux-z`
- Stable local entrypoint: `https://127.0.0.1:8082/remux-z`
- Default session name: `remux-z`

## Why there is no long-lived `z` git branch

This repository keeps `main` and `dev` as the only long-lived branches.

To stay inside that rule:

- the implementation branch is `feat/zellij-bootstrap`
- the runtime label and public hostname use `z`

This keeps the deploy surface easy to recognize without introducing a third permanent release branch.

## Bootstrap commands

```bash
npm run zellij:web:install-launchd
npm run zellij:web:load-launchd
npm run zellij:web:start
npm run zellij:web:status
```

Create a fresh login token when needed:

```bash
npm run zellij:web:create-token
```

## Public routing

The public `zellij.yaoshen.wang` hostname is served through a dedicated Cloudflare named tunnel for the local Zellij web server on port `8082`.

Expected dedicated tunnel config:

```yaml
tunnel: 01695c8c-b5db-40a3-953b-56efb2359cb0
credentials-file: /Users/wangyaoshen/.cloudflared/01695c8c-b5db-40a3-953b-56efb2359cb0.json
ingress:
  - hostname: zellij.yaoshen.wang
    service: https://127.0.0.1:8082
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

The previous `remux-z.yaoshen.wang` hostname is still blocked by an older shared-tunnel route, so the dedicated `zellij.yaoshen.wang` hostname is the working public entrypoint for now.
