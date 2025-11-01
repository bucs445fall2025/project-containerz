from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class Asset(BaseModel):
    name: str
    ticker: str
    S0: float = Field(..., gt=0)
    mu: float
    sigma: float = Field(..., gt=0)

class MCRequest(BaseModel):
    S0: float = Field(..., gt=0)
    K: float = Field(..., gt=0)
    T: float = Field(..., gt=0)
    r: float = Field(..., ge=0)
    sigma: float = Field(..., gt=0)
    n_paths: int = Field(10000, gt=100)
    seed: Optional[int] = Field(None, gt=0)

class MCResponse(BaseModel):
    price: float
    stderr: float
    method: str = "GBM European Call MC"

class MCRequestPortfolio(BaseModel):
    portfolioFinalValues: Optional[List[float]] = None
    meanFinalValue: float
    stdFinalValue: float
    expectedReturn: float 
    portfolioVar95: float
    portfolioCvar95: float
    params: Dict[str, Any]

    @model_validator(mode="after")
    def _check(self):
        if len(self.assets) != len(self.weights):
            raise ValueError("assets and weights must have the same length")
        s = sum(self.weights)
        if not (0.999 <= s <= 1.001):
            raise ValueError("weights must sum to 1 (±0.1%)")
        return self

class MCResponsePortfolio(BaseModel):
    portfolioFinalValues: Optional[List[float]] = None
    meanFinalValue: float
    stdFinalValue: float
    expectedReturn: float
    portfolioVar95: float
    portfolioCvar95: float
    params: Dict[str, Any]
