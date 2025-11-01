from fastapi import FastAPI
from .schemas import MCRequest, MCResponse, MCRequestPortfolio, MCResponsePortfolio
from .monte_carlo import price_european_call_spot_mc, gbm_portfolio

app = FastAPI(title='FinTool AI/Quant Service', version='0.1.0')

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
def simulatePortfolio(req: MCRequestPortfolio):
    portfolioFinalValues, meanFinalValue, stdFinalValue, expectedReturn, portfolioVar95, portfolioCvar95, params = gbm_portfolio(
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
        expectedReturn=expectedReturn,
        portfolioVar95=portfolioVar95,
        portfolioCvar95=portfolioCvar95,
        params=params
    )