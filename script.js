// Rate limiting variables
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 30000; // 30 seconds

async function fetchCryptoData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const currentTime = Date.now();
    
    if (currentTime - lastFetchTime < MIN_FETCH_INTERVAL) {
        const waitTime = MIN_FETCH_INTERVAL - (currentTime - lastFetchTime);
        error.style.display = 'block';
        error.textContent = `Please wait ${Math.ceil(waitTime / 1000)} seconds before refreshing`;
        return null;
    }

    loading.style.display = 'block';
    error.style.display = 'none';
    
    try {
        const timeframe = document.getElementById('timeframe').value;
        const priceChange = timeframe === '7d' ? '7d' : '24h';
        
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false&price_change_percentage=${priceChange}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        lastFetchTime = Date.now();
        
        document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
        return data;
    } catch (error) {
        console.error('Error fetching data:', error);
        error.style.display = 'block';
        error.textContent = `Error: ${error.message}`;
        return null;
    } finally {
        loading.style.display = 'none';
    }
}

function createHeatmap(data) {
    if (!data) return;

    // Clear previous content
    d3.select('#heatmap').html('");

    // Sort data based on selected criterion
    const sortBy = document.getElementById('sortBy').value;
    const timeframe = document.getElementById('timeframe').value;
    const priceChangeField = timeframe === '7d' ? 'price_change_percentage_7d_in_currency' : 'price_change_percentage_24h';

    data.sort((a, b) => {
        if (sortBy === 'market_cap') return b.market_cap - a.market_cap;
        if (sortBy === 'volume') return b.total_volume - a.total_volume;
        if (sortBy === 'price_change_24h') return b[priceChangeField] - a[priceChangeField];
        return 0;
    });

    // Set dimensions
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = Math.min(1200, window.innerWidth - 40) - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    // Calculate grid dimensions
    const cols = Math.ceil(Math.sqrt(data.length));
    const rows = Math.ceil(data.length / cols);
    const baseSize = Math.min(width / cols, height / rows);

    // Create SVG
    const svg = d3.select('#heatmap')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Create color scale
    const colorScale = d3.scaleLinear()
        .domain([-10, 0, 10])
        .range(['#ff4444', document.body.classList.contains('dark-mode') ? '#333333' : '#ffffff', '#44ff44'])
        .clamp(true);

    // Calculate size scale for market cap
    const marketCapExtent = d3.extent(data, d => d.market_cap);
    const sizeScale = d3.scaleLinear()
        .domain(marketCapExtent)
        .range([baseSize * 0.6, baseSize * 0.95]);

    // Create tiles
    svg.selectAll('rect')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'tile')
        .attr('x', (d, i) => (i % cols) * baseSize + (baseSize - sizeScale(d.market_cap)) / 2)
        .attr('y', (d, i) => Math.floor(i / cols) * baseSize + (baseSize - sizeScale(d.market_cap)) / 2)
        .attr('width', d => sizeScale(d.market_cap))
        .attr('height', d => sizeScale(d.market_cap))
        .attr('fill', d => colorScale(d[priceChangeField]))
        .on('mouseover', function(event, d) {
            d3.select(this).style('opacity', 0.8);
            tooltip.transition()
                .duration(200)
                .style('opacity', .9);
            tooltip.html(`
                <strong>${d.name} (${d.symbol.toUpperCase()})</strong><br/>
                Price: $${d.current_price.toLocaleString()}<br/>
                24h Change: ${d.price_change_percentage_24h?.toFixed(2) || 'N/A'}%<br/>
                7d Change: ${d.price_change_percentage_7d_in_currency?.toFixed(2) || 'N/A'}%<br/>
                Market Cap: $${d.market_cap.toLocaleString()}<br/>
                Volume: $${d.total_volume.toLocaleString()}
            `)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            d3.select(this).style('opacity', 1);
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        });

    // Add symbols
    svg.selectAll('text')
        .data(data)
        .enter()
        .append('text')
        .attr('x', (d, i) => (i % cols) * baseSize + baseSize / 2)
        .attr('y', (d, i) => Math.floor(i / cols) * baseSize + baseSize / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', d => `${sizeScale(d.market_cap) / 4}px`)
        .style('fill', d => Math.abs(d[priceChangeField]) > 5 ? 'white' : 'black')
        .text(d => d.symbol.toUpperCase());
}

function calculateRecommendationScore(coin) {
    let score = 0;
    
    // Market cap factor (prefer established but not giant coins)
    const marketCapLog = Math.log10(coin.market_cap);
    if (marketCapLog > 8 && marketCapLog < 11) score += 2;
    else if (marketCapLog >= 7) score += 1;

    // Volume to market cap ratio (higher is better, indicates active trading)
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    if (volumeToMarketCap > 0.2) score += 2;
    else if (volumeToMarketCap > 0.1) score += 1;

    // Price change factors
    const priceChange24h = coin.price_change_percentage_24h || 0;
    const priceChange7d = coin.price_change_percentage_7d_in_currency || 0;
    
    // Prefer moderate gains over extreme movements
    if (priceChange24h > 0 && priceChange24h < 15) score += 1;
    if (priceChange7d > 0 && priceChange7d < 30) score += 1;

    // Penalize extreme volatility
    if (Math.abs(priceChange24h) > 20) score -= 1;
    if (Math.abs(priceChange7d) > 40) score -= 1;

    return score;
}

function generateRecommendationReason(coin, score) {
    const reasons = [];
    
    // Market cap analysis
    const marketCapLog = Math.log10(coin.market_cap);
    if (marketCapLog > 8 && marketCapLog < 11) {
        reasons.push("Established market presence with growth potential");
    } else if (marketCapLog >= 7) {
        reasons.push("Emerging market player");
    } else if (marketCapLog > 11) {
        reasons.push("Large-cap stability");
    }

    // Volume analysis
    const volumeToMarketCap = coin.total_volume / coin.market_cap;
    if (volumeToMarketCap > 0.2) {
        reasons.push("High trading activity");
    } else if (volumeToMarketCap > 0.1) {
        reasons.push("Healthy trading volume");
    }

    // Price movement analysis
    const priceChange24h = coin.price_change_percentage_24h || 0;
    const priceChange7d = coin.price_change_percentage_7d_in_currency || 0;

    if (priceChange24h > 0 && priceChange24h < 15) {
        reasons.push("Steady 24h growth");
    }
    if (priceChange7d > 0 && priceChange7d < 30) {
        reasons.push("Positive weekly trend");
    }

    // Volatility analysis
    if (Math.abs(priceChange24h) <= 5) {
        reasons.push("Low volatility");
    } else if (Math.abs(priceChange24h) <= 10) {
        reasons.push("Moderate volatility");
    }

    // Market momentum
    if (priceChange24h > 0 && priceChange7d > 0) {
        reasons.push("Positive momentum");
    }

    // Select the top 2-3 most relevant reasons
    let finalReasons = reasons.slice(0, Math.min(3, Math.max(2, Math.floor(score))));
    return finalReasons.join(". ") + ".";
}

function updateRecommendations(data) {
    if (!data) return;

    const recommendationsList = document.getElementById('recommendationsList');
    recommendationsList.innerHTML = '';

    // Calculate scores and sort
    const recommendations = data
        .map(coin => ({
            ...coin,
            score: calculateRecommendationScore(coin)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    // Create recommendation items
    recommendations.forEach((coin, index) => {
        const scoreClass = coin.score >= 4 ? 'high' : coin.score >= 2 ? 'medium' : 'low';
        const reason = generateRecommendationReason(coin, coin.score);
        
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <div class="recommendation-header">
                <h3>
                    ${index + 1}. ${coin.symbol.toUpperCase()}
                    <span class="recommendation-score score-${scoreClass}">
                        Score: ${coin.score}
                    </span>
                </h3>
            </div>
            <p class="coin-stats">
                Price: $${coin.current_price.toLocaleString()}<br>
                24h: ${coin.price_change_percentage_24h?.toFixed(2) || 'N/A'}%<br>
                7d: ${coin.price_change_percentage_7d_in_currency?.toFixed(2) || 'N/A'}%<br>
                Volume: $${(coin.total_volume / 1e6).toFixed(2)}M
            </p>
            <p class="recommendation-reason">
                <strong>Why:</strong> ${reason}
            </p>
        `;
        recommendationsList.appendChild(item);
    });
}

async function updateHeatmap() {
    const data = await fetchCryptoData();
    if (data) {
        createHeatmap(data);
        updateRecommendations(data);
    }
}

// Event Listeners
document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    updateHeatmap();
});

document.getElementById('sortBy').addEventListener('change', updateHeatmap);
document.getElementById('timeframe').addEventListener('change', updateHeatmap);
document.getElementById('refreshButton').addEventListener('click', updateHeatmap);

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateHeatmap, 250);
});

// Initial load
updateHeatmap();

// Auto update every 5 minutes
setInterval(updateHeatmap, 5 * 60 * 1000);
