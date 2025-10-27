from typing import List, Optional, Dict, Any, Tuple
from fastapi import FastAPI
from pydantic import BaseModel, Field
from .monte_carlo import price_european_call_spot_mc, gbmPortfolio

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


class MCReqestPortfolio(BaseModel):
    assets: List[Asset] = Field(..., min_length=1, description="List of assets") 
    weights: List[float] = Field(..., min_length=1, description="Portfolio weights")
    T: float = Field(..., gt=0, description="Horizon in years")
    r: float = Field(..., description="Risk-free rate as decimal")
    n_steps: int = Field(252, ge=2, le=100_000, description="timesteps per path")
    n_paths: int = Field(50_000, ge=1_000, le=2_000_000, description="Number of Monte Carlo paths")
    seed: Optional[int] = Field(None, gt=0, description="Optional RNG seed")
    return_paths: bool = Field(False, description="return all final path values")

    # maybe add a validator for this maybe idk

class MCResponsePortfolio(BaseModel):
    portfolioFinalValues: Optional[List[float]] = None
    meanFinalValue: float
    stdFinalValue: float
    portfolioVar95: float
    portfolioCvar95: float
    params: List[Dict[str, Any]]

@app.get('/health')
def health():
    return {"ok": True}

@app.post('/simulate', response_model=MCResponse)
def simulate(req: MCRequest):
    price, stderr = price_european_call_spot_mc(
        S0=req.S0, K=req.K, T=req.T, r=req.r, sigma=req.sigma, n_paths=req.n_paths, seed=req.seed
    )
    return MCResponse(price=price, stderr=stderr)

@app.post('/sim/portfolio', response_model=MCResponsePortfolio)
def simulatePortfolio(req: MCReqestPortfolio):
    portfolioFinalValues, meanFinalValue, stdFinalValue, portfolioVar95, portfolioCvar95, params = gbmPortfolio(
        assets=[a.model_dump() for a in req.assets], 
        weights=req.weights, 
        T=req.T, 
        r=req.r,
        n_steps=req.n_steps, 
        n_paths=req.n_paths, 
        seed=req.seed
    )
    return MCResponsePortfolio(
        portfolioFinalValues=portfolioFinalValues if req.return_paths else None, 
        meanFinalValue=meanFinalValue, 
        stdFinalValue=stdFinalValue, 
        portfolioVar95=portfolioVar95, 
        portfolioCvar95=portfolioCvar95, 
        params=params
    )