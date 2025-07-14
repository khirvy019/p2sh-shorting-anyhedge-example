### Setup
need `.env` in `src` folder:
```
OWNER_WIF='.................'
```

will be used as contract parameter for smart contract used for p2sh funding

### Test shorting
- Make sure the contract has funds
- You can manually set the UTXOS of the contract in `src/main.js` on `TREAURY_CONTRACT_UTXOS` array
```
cd src // if not yet in src folder
node main.js
```

### Sweep funds from treasury contract
You can sweep back the funds after testing or after settlement of the shorted funds

```
cd src // if not yet in src folder
node sweep.js
```

### Inspect addresses
Inspect addresses to fund treasury contract
```
cd src // if not yet in src folder
node inspect.js

```