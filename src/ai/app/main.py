from fastapi import FastAPI
from pydantic import BaseModel, Field
from .monte_carlo import price_european_call_spot_mc

app = FastAPI(title='FinTool AI/Quant Service', version='0.1.0')

class MCRequest(BaseModel):
    S0: float = Field(..., gt=0, description='Spot price')
    K: float = Field(..., gt=0, description='Strike')
    T: float = Field(..., gt=0, description='Time to maturity in years')
    r: float = Field(..., gt=0, description='Risk-free rate as decimal')
    sigma: float = Field(..., gt=0, description='Volatility as decimal')
    n_paths: int = Field(10000, gt=100, description='Number of Monte Carlo paths')
    seed: int | None = Field(None, gt=0, description='Optional RNG seed for reproducibility')

class MCResponse(BaseModel):
    price: float
    stderr: float
    method: str = "GBM European Call MC"

@app.get('/health')
def health():
    return {"ok": True}

@app.post('/simulate', response_model=MCResponse)
def simulate(req: MCRequest):
    price, stderr = price_european_call_spot_mc(
        S0=req.S0, K=req.K, T=req.T, r=req.r, sigma=req.sigma, n_paths=req.n_paths, seed=req.seed
    )
    return MCResponse(price=price, stderr=stderr)