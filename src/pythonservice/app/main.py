from fastapi import FastAPI
import uvicorn
from .schemas import MCRequestAsset, MCResponseAsset, MCRequestPortfolio, MCResponsePortfolio
from .monte_carlo import gbm_asset, gbm_portfolio

app = FastAPI(title='FinTool AI/Quant Service', version='0.1.0')

@app.get('/health')
def health():
    return {"ok": True}


@app.post('/sim/asset', response_model=MCResponseAsset)
def simulateAsset(req: MCRequestAsset):
    FinalValue, meanFinalValue, stdFinalValue, expectedReturn, AssetVar95, AssetCvar95, params = gbm_asset(
        Name=req.Name,
        S0=req.S0,
        mu=req.mu,
        sigma=req.sigma,
        weight=req.weight,
        T=req.T,
        r=req.r,
        n_steps=req.n_steps,
        n_paths=req.n_paths,
        seed=req.seed,
    )
    return MCResponseAsset(
        portfolioFinalValue=FinalValue,
        meanFinalValue=meanFinalValue,
        stdFinalValue=stdFinalValue,
        expectedReturn=expectedReturn,
        AssetVar95=AssetVar95,
        AssetCvar95=AssetCvar95,
        params=params
    )

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


if __name__ == "__main__":
  uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=False)