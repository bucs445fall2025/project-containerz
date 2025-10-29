from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import yfinance as yf

def price_european_call_spot_mc(
    S0: float, K: float, T: float, r: float, sigma: float, n_paths: int = 10000, seed: int | None = None
):
    """
    Black–Scholes under GBM; Monte Carlo pricing for a European call.
    Returns (price, std_error).
    """
    if seed is not None:
        np.random.seed(seed)

    # draw standard normals for terminal simulation
    Z = np.random.randn(n_paths)
    # Geometric Brownian Motion terminal price
    ST = S0 * np.exp((r - 0.5 * sigma**2) * T + sigma * np.sqrt(T) * Z)
    payoff = np.maximum(ST - K, 0.0)
    disc_payoff = np.exp(-r * T) * payoff

    price = disc_payoff.mean()
    stderr = disc_payoff.std(ddof=1) / np.sqrt(n_paths)
    return price, stderr

# add single asset simulation, and simulate portfolio functions here

def gbmPortfolio(
    assets: list[Assets], weights: list[float], T: int, r: int, n_steps: int, n_paths: int, seed: int | None = None
):
    """
    GBM, MonteCarlo for portfolio
    might have to just securities, cause they have the tickers
    Assets need to have ticker symbols
    need to remove the weights for non existing assets. i think i can do this in main.py
    """

    def check_ticker(symbol):
        """
        Checks if a ticker symbol exists using yfinance.

        :param ticker_symbol: The stock ticker symbol (e.g., 'AAPL').
        :return: True if the ticker exists, False otherwise.
        """
        try:
            # Create a Ticker object
            ticker = yf.Ticker(symbol)

            # Access the info attribute. If the ticker is invalid,
            # the dictionary will contain very few keys.
            info = ticker.info

            # A non-existent ticker will result in a dictionary with a single key ('symbol').
            if len(info) > 1:
                return True
            else:
                return False
        except Exception as e:
            print(f"An error occurred for '{symbol}': {e}")
            return False
    
    existing_assets = []
    for t in assets:
        exists = check_ticker(t)
        if exists:
            existing_assets.append(t)
        else:
            continue
    
    n_assets = len(existing_assets) 

    def stock_pricing(symbol):
        ticker = yf.Ticker(symbol)
        latest = ticker.history(period="1d") # gets latest prices
        return latest['Close'].iloc[-1]

    S0 = np.array([stock_pricing(t) for t in existing_assets])

    T = 1  # 1 year
    N = 252  # trading days
    dt = T / N
    
    # Portfolio weights (sum to 1)

    # Annual drift and volatility
    # mu = np.array([0.08, 0.12, 0.10])
    # sigma = np.array([0.15, 0.20, 0.18])

    mu = np.array([]) # rangomize this 
    sigma = mu # set it equal to mu for now

    M = 10000  # simulations

    # Initialize price paths
    price_paths = np.zeros((M, N + 1, n_assets))
    price_paths[:, 0, :] = S0

    # Simulate GBM with correlated shocks
    for m in range(M):
        Z = np.random.normal(size=(N, n_assets))
        correlated_Z = Z @ L.T
        for t in range(1, N + 1):
            price_paths[m, t, :] = price_paths[m, t - 1, :] * np.exp(
                (mu - 0.5 * sigma**2) * dt + np.sqrt(dt) * correlated_Z[t - 1]
            )

    # Compute weighted portfolio value per simulation & timestep
    portfolio_values = np.sum(price_paths * weights, axis=2)  # shape (M, N+1)

    # Scale portfolio so initial value = 100,000
    initial_portfolio_value = np.sum(S0 * weights)
    scale_factor = 100000 / initial_portfolio_value
    portfolio_values *= scale_factor


    
    # return portfolioFinalValues, meanFinalValue, stdFinalValue, portfolioVar95, portfolioCvar95, params
