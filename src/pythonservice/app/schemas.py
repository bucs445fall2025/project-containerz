from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class Asset(BaseModel):
    S0: float
    mu: float
    sigma: float
    quantity: Optional[float] = None

class MCRequestAsset(BaseModel):
    Name: str
    S0: float
    mu: float
    sigma: float
    weight: float
    T: float
    r: float
    n_steps: int = 252
    n_paths: int = 10_000
    seed: Optional[int] = None

class MCResponseAsset(BaseModel):
    Name: str
    FinalValue: Optional[float] = None
    meanFinalValue: float
    stdFinalValue: float
    expectedReturn: float
    AssetVar95: float
    AssetCvar95: float
    params: Dict[str, Any]


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
    initial_value: Optional[float] = None

class MCResponsePortfolio(BaseModel):
    portfolioFinalValues: Optional[List[float]] = None
    meanFinalValue: float
    stdFinalValue: float
    expectedReturn: float
    portfolioVar95: float
    portfolioCvar95: float
    params: Dict[str, Any]
