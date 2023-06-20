const PROXY_CONFIG = [
  {
    context: [
      "/weatherforecast",
    ],
    target: "https://localhost:7199",
    secure: false
  }
]

module.exports = PROXY_CONFIG;
