# Cryptocurrency Heatmap with Recommendations

An interactive cryptocurrency heatmap that visualizes the top 200 cryptocurrencies by market cap, with real-time price changes and smart recommendations.

## Features

- Real-time data from CoinGecko API
- Interactive heatmap visualization using D3.js
- Dark/Light mode toggle
- Smart recommendations based on:
  - Market capitalization
  - Trading volume
  - Price movements
  - Volatility patterns
- Multiple sorting options
- 24h and 7d timeframe views
- Responsive design
- Rate limiting to prevent API abuse

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/crypto-heatmap.git
```

2. Open `index.html` in your web browser

That's it! No build process or dependencies to install.

## Usage

- Use the dropdown menus to sort cryptocurrencies by different metrics
- Toggle between 24h and 7d timeframes
- Click the moon icon to switch between dark and light modes
- Hover over tiles to see detailed information
- Check the recommendations panel for algorithmic trading suggestions
- Click the refresh button to update data (30-second cooldown applies)

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- D3.js for visualization
- CoinGecko API for cryptocurrency data

## Disclaimer

The recommendations provided by this tool are based on technical analysis and should not be considered as financial advice. Always do your own research before making investment decisions.

## License

MIT License - feel free to use this project however you'd like!
