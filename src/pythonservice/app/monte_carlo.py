from typing import List, Optional, Dict, Any, Tuple
import numpy as np
import yfinance as yf
from .schemas import Asset

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

def gbm_asset(
        Name: str,
        S0: float,
        mu: float,
        sigma: float,
        weight: float,
        T: float,
        r: float,
        n_steps: int = 252,
        n_paths: int = 10_000,
        seed: Optional[int] = None
) -> Tuple[float, float, float, float, float, float, Dict[str, Any]]:
    """
    Run a GBM Monte Carlo simulation for a single asset/position.
    Returns summary statistics that mirror the portfolio simulation payload.
    """

    if S0 <= 0 or sigma <= 0:
        raise ValueError("S0 and sigma must be > 0")
    if n_steps < 1:
        raise ValueError("n_steps must be >= 1")
    if n_paths < 2:
        raise ValueError("n_paths must be >= 2")

    w = float(weight) if weight is not None else 1.0
    if not np.isfinite(w) or w <= 0:
        w = 1.0

    dt = float(T) / float(n_steps)
    rng = np.random.default_rng(seed)
    Z = rng.standard_normal(size=(n_paths, n_steps))

    drift = (mu - 0.5 * sigma**2) * dt
    diff = sigma * np.sqrt(dt)
    increments = drift + diff * Z

    log_ST = np.log(S0) + increments.cumsum(axis=1)
    ST = np.exp(log_ST[:, -1])

    initial_value = w * S0
    final_values = w * ST

    median_final = float(np.median(final_values))
    mean_final = float(final_values.mean())
    std_final = float(final_values.std(ddof=1)) if n_paths > 1 else 0.0

    returns = (final_values / initial_value) - 1.0
    exp_ret = float(returns.mean())
    var95 = float(np.quantile(returns, 0.05))
    tail = returns[returns <= var95]
    cvar95 = float(tail.mean()) if tail.size else var95

    params = {
        "name": Name,
        "S0": float(S0),
        "mu": float(mu),
        "sigma": float(sigma),
        "weight": float(weight) if weight is not None else float(w),
        "r": float(r),
        "initialValue": float(initial_value),
        "dt": dt,
        "n_steps": int(n_steps),
        "n_paths": int(n_paths)
    }

    return median_final, mean_final, std_final, exp_ret, var95, cvar95, params


def gbm_portfolio(
        assets: List[Dict[str, Any]],
        weights: List[float],
        T: float,
        r: float,
        n_steps: int = 252,
        n_paths: int = 10_000,
        seed: Optional[int] = None,
        corr: Optional[List[List[float]]] = None,
        initial_value: Optional[float] = None
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

    parsed_quantities = []
    for a in assets:
        if not isinstance(a, dict):
            parsed_quantities.append(np.nan)
            continue
        raw_q = a.get("quantity", np.nan)
        try:
            q_val = float(raw_q)
        except (TypeError, ValueError):
            q_val = np.nan
        parsed_quantities.append(q_val)
    quantities = np.array(parsed_quantities, dtype=float)
    if np.any(~np.isfinite(quantities) | (quantities <= 0)):
        base_value = float(initial_value) if initial_value and initial_value > 0 else 1.0
        quantities = (w * base_value) / S0

    V0 = float(np.sum(quantities * S0))
    if V0 <= 0:
        raise ValueError("initial portfolio value must be > 0")

    # correleation meatrices
    C = _validate_corr(corr, n_assets)
    L = np.linalg.cholesky(C)

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

    VT = np.sum(quantities[None, :] * ST, axis=1)

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
        "weights": w.tolist(),
        "quantities": quantities.tolist(),
        "initial_value_arg": float(initial_value) if initial_value is not None else None
    }

    return finals, mean_val, std_val, exp_ret, var95, cvar95, params
