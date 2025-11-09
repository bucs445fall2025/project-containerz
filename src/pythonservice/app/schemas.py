from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class Asset(BaseModel):
    S0: float
    mu: float
    sigma: float

class MCRequestPortfolio(BaseModel):
    assets: List[Asset]
    weights: List[float]
    T: float
    r: float
    n_steps: int = 252
    n_paths: int = 10_000
    seed: Optional[int] = None
    return_paths: bool = False
    corr: Optional[List[List[float]]] = None

class MCResponsePortfolio(BaseModel):
    portfolioFinalValues: Optional[List[float]] = None
    meanFinalValue: float
    stdFinalValue: float
    expectedReturn: float
    portfolioVar95: float
    portfolioCvar95: float
    params: Dict[str, Any]

class MCRequestAsset(BaseModel):
    S0: float
    mu: float
    sigma: float
    T: float
    r: float
    n_steps: int = 252
    n_paths: int = 10_000
    seed: Optional[int] = None
    return_paths: bool = False

class MCResponseAsset(BaseModel):
    finalPrices: Optional[List[float]] = None
    meanFinalPrice: float
    stdFinalPrice: float
    expectedReturn: float
    assetVar95: float
    assetCvar95: float
    params: Dict[str, Any]
