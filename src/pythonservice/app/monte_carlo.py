from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import yfinance as yf

# ---- helpers ---- 
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

def stock_pricing(symbol):
        ticker = yf.Ticker(symbol)
        latest = ticker.history(period="1d") # gets latest prices
        return latest['Close'].iloc[-1]

def _validate_corr(corr: Optional[List[List[float]]], n_assets: int) -> np.ndarray:
    if corr is None:
        return np.eye(n_assets)
    C = np.array(corr, dtype=float)
    if C.shape != (n_assets, n_assets):
        raise ValueError("corr must be n_assets x n_assets")

    C = 0.5 * (C + C.T)
    np.fill_diagonal(C, 1.0)

    try:
        np.linalg.cholesky(C)
    except np.linalg.LinAlgError:
        raise ValueError("corr matrix must be positive semi-definite")
    return C


# ---- simulation ---- 

#example
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

def gbm_portfolio(
    assets: List[Dict[str, Any]], weights: List[float], T: float, r: float, n_steps: int = 252, n_paths: int = 10_000, seed: Optional[int] = None, corr: Optional[List[List[float]]] = None
) -> Tuple[List[float], float, float, float, float, float, Dict[str, Any]]:
    """
    GBM, MonteCarlo for portfolio
    might have to just securities, cause they have the tickers
    Assets need to have ticker symbols
    need to remove the weights for non existing assets. i think i can do this in main.py
    """
    # simple checks
    n_assets = len(assets)
    if n_assets == 0:
        raise ValueError("no assets provided")
    if len(weights) != n_assets:
        raise ValueError("weights length mismatch")
    if n_steps < 1:
        raise ValueError("n_steps must be >= 1")
    if n_paths < 2:
        raise ValueError("n_paths must be >= 2")

    w = np.array(weights, dtype=float)
    sw = w.sum()
    if sw <= 0:
        raise ValueError("weights must sum > 0")
    if not (0.999 <= sw <= 1.001):
        w = w / sw 

    # initializations
    S0 = np.array([float(a["S0"]) for a in assets], dtype=float)
    mu = np.array([float(a["mu"]) for a in assets], dtype=float)
    sig = np.array([float(a["sigma"]) for a in assets], dtype=float)
    if np.any(S0 <= 0) or np.any(sig <= 0):
        raise ValueError("S0 and sigma must be > 0 for all assets")
    
    # correlation matrix stuff
    if corr is None:
        C = np.eye(n_assets, dtype=float)
    else:
        C = np.asarray(corr, dtype=float)
        if C.shape != (n_assets, n_assets):
            raise ValueError("corr must be (n_assets x n_assets)")
        C = 0.5 * (C + C.T)
        np.fill_diagonal(C, 1.0)
    
    jitter = 0.0
    while True:
        try:
            L = np.linalg.cholesky(C + np.eye(n_assets) * jitter)
            break
        except np.linalg.LinAlgError:
            jitter = 1e-10 if jitter == 0.0 else jitter * 10
            if jitter > 1e-4:
                raise ValueError("Correlation matrix not positive semidefinite")

    # --- simulationing ---
    dt = float(T) / float(n_steps)
    rng = np.random.default_rng(seed)

    Z = rng.standard_normal(size=(n_paths, n_steps, n_assets))
    Zc = Z @ L.T

    drift = (mu - 0.5 * sig**2) * dt
    diff = sig * np.sqrt(dt)

    inc = drift + diff * Zc
    log_ST = np.log(S0)[None, None, :] + inc.cumsum(axis=1)
    ST = np.exp(log_ST[:, -1, :])

    V0 = float(np.sum(w * S0))
    VT = np.sum(w[None, :] * ST, axis=1)

    finals = VT.tolist()
    mean_val = float(VT.mean())
    std_val = float(VT.std(ddof=1)) if n_paths > 1 else 0.0

    R = (VT / V0) - 1.0
    exp_ret = float(R.mean())
    var95 = float(np.quantile(R, 0.05))
    tail = R[R <= var95]
    cvar95 = float(tail.mean()) if tail.size else var95

    params = {
        "n_assets": n_assets,
        "has_corr": corr is not None,
        "V0": V0,
        "dt": dt,
        "mu": mu.tolist(),
        "sigma": sig.tolist(),
        "jitter_used": jitter
    }

    return finals, mean_val, std_val, exp_ret, var95, cvar95, params