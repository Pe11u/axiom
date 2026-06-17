<p align="center">
  <img src="docs/logo.svg" width="96" alt="Axiom">
</p>

# Axiom

A desktop app for building and running HTTP automation flows. This is an app to perform requests towards a target webapp and offers a lot of tools to work with the results. It can be used for scraping and parsing.

<table border="0">
  <tr>
    <td><img src="docs/1.png" alt="Bulk Run"></td>
    <td><img src="docs/2.png" alt="Data Sets"></td>
  </tr>
  <tr>
    <td><img src="docs/3.png" alt="Flow Editor 1"></td>
    <td><img src="docs/4.png" alt="Flow Editor 2"></td>
  </tr>
</table>

## Features

- Node-based flow editor
- HTTP request node with TLS fingerprinting, cookie sessions, and rate limiting
- String and regex transformation nodes
- Dataset management for input data
- Proxy list management with rotation
- Job runner with real-time results table

## Download

Get the latest Windows installer from the [Releases](../../releases/latest) page.

> **Note:** Windows may show a SmartScreen warning on first launch. Click "More info" → "Run anyway" to proceed.

## Building from Source

**Requirements:** Go 1.25+, Node.js 20+, [Wails v2](https://wails.io)

```bash
git clone https://github.com/t4rutaru/axiom.git
cd axiom
wails dev
```

To build the installer:

```bash
wails build -nsis
```

## License

MIT — see [LICENSE](LICENSE)
