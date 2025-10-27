import numpy as np

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
    assets: list[json], weights: list[float], T: int, r: int, n_steps: int, n_paths: int, seed: int | None = None
):
    """
    GBM, MonteCarlo for portfolio
    """
    if seed is not None:
        np.random.seed(seed)
    
    # return portfolioFinalValues, meanFinalValue, stdFinalValue, portfolioVar95, portfolioCvar95, params
