const User = require('../models/User.js');
const { plaidClient, getProducts, getCountryCodes } = require('../services/plaid.js');

function getRedirectUri() {
  return process.env.PLAID_REDIRECT_URI || undefined;
}

exports.createLinkToken = async (req, res) => {
  try {
		const user = await User.findById(req.user.id).select('verified +plaidAccessToken +plaidItemId');
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}
		if (!user.verified) {
			return res.status(403).json({
				success: false,
				message: "You must verify your account before linking!"
			});
		}
    const products = getProducts();
    const baseRequest = {
      user: {
        client_user_id: req.user.id
      },
      client_name: process.env.PLAID_CLIENT_NAME || 'Fin Tool',
      country_codes: getCountryCodes(),
      language: process.env.PLAID_LANGUAGE || 'en',
      redirect_uri: getRedirectUri()
    };

    if (user.plaidAccessToken) {
      try {
        const itemResponse = await plaidClient.itemGet({
          access_token: user.plaidAccessToken
        });
        const billedProducts =
          itemResponse.data?.item?.billed_products ??
          itemResponse.data?.item?.products ??
          [];
        const missingProducts = products.filter(
          (product) => !billedProducts.includes(product)
        );

        if (missingProducts.length > 0) {
          baseRequest.access_token = user.plaidAccessToken;
          baseRequest.additional_consented_products = missingProducts;
        } else {
          baseRequest.products = products;
        }
      } catch (itemError) {
        console.warn('Plaid item lookup failed while creating link token', itemError);
        baseRequest.products = products;
      }
    } else {
      baseRequest.products = products;
    }

    const response = await plaidClient.linkTokenCreate(baseRequest);

    res.json({
      success: true,
      link_token: response.data.link_token,
      expiration: response.data.expiration
    });
  } catch (error) {
    console.error('Plaid link token error', error);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error_message || error.message
    });
  }
};

exports.exchangePublicToken = async (req, res) => {
  try {
		const existingUser = await User.findById(req.user.id).select('verified');
		if (!existingUser) {
			return res.status(404).json({
				success: false,
				message: "User not found"
			});
		}
		if (!existingUser.verified) {
			return res.status(403).json({
				success: false,
				message: "You must verify your account before linking!"
			});
		}
    const { public_token: publicToken } = req.body || {};

    if (!publicToken) {
      return res.status(400).json({
        success: false,
        message: 'public_token is required'
      });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const user = await User.findById(req.user.id).select('+plaidAccessToken +plaidItemId');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.plaidAccessToken = accessToken;
    user.plaidItemId = itemId;
    await user.save();

    res.json({
      success: true,
      item_id: itemId
    });
  } catch (error) {
    console.error('Plaid exchange error', error);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.error_message || error.message
    });
  }
};

exports.getAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+plaidAccessToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.plaidAccessToken) {
      return res.json({
        success: true,
        accounts: []
      });
    }

    const accountsResponse = await plaidClient.accountsBalanceGet({
      access_token: user.plaidAccessToken
    });

    res.json({
      success: true,
      item_id: user.plaidItemId,
      accounts: accountsResponse.data.accounts
    });
  } catch (error) {
    console.error('Plaid get accounts error', error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error_message || error.message;

    if (status === 400 || status === 401) {
      await User.findByIdAndUpdate(req.user.id, {
        $unset: {
          plaidAccessToken: 1,
          plaidItemId: 1,
          plaidCursor: 1
        },
        $set: {
          plaidTransactions: []
        }
      });
    }

    res.status(status).json({
      success: false,
      message
    });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const MAX_TRANSACTIONS = 200;
    const user = await User.findById(req.user.id).select(
      '+plaidAccessToken +plaidItemId +plaidCursor +plaidTransactions'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const compareDesc = (a, b) => {
      if (!a?.date || !b?.date) {
        return (b?.date ? 1 : 0) - (a?.date ? 1 : 0);
      }
      if (a.date === b.date) {
        const aAuthorized = a.authorized_date || a.authorized_datetime || '';
        const bAuthorized = b.authorized_date || b.authorized_datetime || '';
        if (aAuthorized === bAuthorized) {
          return 0;
        }
        return aAuthorized < bAuthorized ? 1 : -1;
      }
      return a.date < b.date ? 1 : -1;
    };

    const storedTransactions = Array.isArray(user.plaidTransactions)
      ? [...user.plaidTransactions].sort(compareDesc).slice(0, MAX_TRANSACTIONS)
      : [];

    if (!user.plaidAccessToken) {
      return res.json({
        success: true,
        item_id: user.plaidItemId,
        transactions: storedTransactions,
        total_transactions: storedTransactions.length,
        latest_transactions: storedTransactions.slice(0, 25),
        removed: []
      });
    }

    // Iterate /transactions/sync
    let cursor = user.plaidCursor || null; // null means "give me full history"
    const added = [];
    const modified = [];
    const removed = [];
    let hasMore = true;

    while (hasMore) {
      const syncResp = await plaidClient.transactionsSync({
        access_token: user.plaidAccessToken,
        cursor
      });

      const data = syncResp.data;
      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    const transactionMap = new Map();
    const indexTransaction = (transaction) => {
      if (!transaction) {
        return;
      }
      const key = transaction.transaction_id || transaction.pending_transaction_id;
      if (!key) {
        return;
      }
      transactionMap.set(key, transaction);
    };

    storedTransactions.forEach(indexTransaction);
    added.forEach(indexTransaction);
    modified.forEach(indexTransaction);
    removed.forEach((transaction) => {
      const key = transaction.transaction_id || transaction.pending_transaction_id;
      if (key) {
        transactionMap.delete(key);
      }
    });

    const combinedTransactions = Array.from(transactionMap.values()).sort(compareDesc);
    const limitedTransactions = combinedTransactions.slice(0, MAX_TRANSACTIONS);

    const storedJson = JSON.stringify(storedTransactions);
    const limitedJson = JSON.stringify(limitedTransactions);
    const transactionsChanged = storedJson !== limitedJson;

    let shouldPersist = false;

    if (cursor !== user.plaidCursor) {
      user.plaidCursor = cursor;
      shouldPersist = true;
    }

    if (transactionsChanged) {
      user.plaidTransactions = limitedTransactions;
      shouldPersist = true;
    }

    if (shouldPersist) {
      await user.save();
    }

    return res.json({
      success: true,
      item_id: user.plaidItemId,
      transactions: limitedTransactions,
      total_transactions: limitedTransactions.length,
      latest_transactions: limitedTransactions.slice(0, 25),
      removed
    });
  } catch (error) {
    console.error('Plaid get transactions error', error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error_message || error.message;

    if (status === 400 || status === 401) {
      await User.findByIdAndUpdate(req.user.id, {
        $unset: { plaidAccessToken: 1, plaidItemId: 1, plaidCursor: 1 },
        $set: { plaidTransactions: [] }
      });
    }

    return res.status(status).json({ success: false, message });
  }
};

exports.getInvestments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      '+plaidAccessToken +plaidItemId +plaidInvestments'
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const storedInvestments = Array.isArray(user.plaidInvestments) ? user.plaidInvestments : [];

    if (!user.plaidAccessToken) {
      return res.json({
        success: true,
        investments_transactions: {
          accounts: [],
          investment_transactions: storedInvestments,
          securities: []
        }
      });
    }

    const itemResponse = await plaidClient.itemGet({
      access_token: user.plaidAccessToken
    });
    const billedProducts =
      itemResponse.data?.item?.billed_products ?? itemResponse.data?.item?.products ?? [];
    const availableProducts = itemResponse.data?.item?.available_products ?? [];
    const hasInvestmentsConsent = billedProducts.includes('investments');

    if (!hasInvestmentsConsent) {
      const message = availableProducts.includes('investments')
        ? 'Your connection supports investments, but additional consent is required. Reconnect this institution to grant investments access.'
        : 'The linked institution does not provide investments data through Plaid. Connect a brokerage account that supports investments.';
      return res.status(409).json({
        success: false,
        code: 'INVESTMENTS_NOT_CONSENTED',
        message
      });
    }

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const configs = {
      access_token: user.plaidAccessToken,
      start_date: startDate,
      end_date: endDate
    };

    const holdingsResponse = await plaidClient.investmentsHoldingsGet({
      access_token: user.plaidAccessToken
    });

    const investmentTransactionsResponse = await plaidClient.investmentsTransactionsGet(configs);
    const investmentsData = investmentTransactionsResponse.data.investment_transactions || [];

    await User.findByIdAndUpdate(req.user.id, {
      $set: { plaidInvestments: investmentsData }
    });

    const holdingsData = Array.isArray(holdingsResponse.data?.holdings)
      ? holdingsResponse.data.holdings
      : [];
    const holdingsAccounts = Array.isArray(holdingsResponse.data?.accounts)
      ? holdingsResponse.data.accounts
      : [];
    const holdingsSecurities = Array.isArray(holdingsResponse.data?.securities)
      ? holdingsResponse.data.securities
      : [];

    const transactionAccounts = Array.isArray(investmentTransactionsResponse.data?.accounts)
      ? investmentTransactionsResponse.data.accounts
      : [];
    const transactionSecurities = Array.isArray(investmentTransactionsResponse.data?.securities)
      ? investmentTransactionsResponse.data.securities
      : [];

    const accountsMap = new Map();
    [...holdingsAccounts, ...transactionAccounts].forEach((account) => {
      if (account?.account_id && !accountsMap.has(account.account_id)) {
        accountsMap.set(account.account_id, account);
      }
    });

    const securitiesMap = new Map();
    [...holdingsSecurities, ...transactionSecurities].forEach((security) => {
      if (security?.security_id && !securitiesMap.has(security.security_id)) {
        securitiesMap.set(security.security_id, security);
      }
    });

    const responsePayload = {
      accounts: Array.from(accountsMap.values()),
      holdings: holdingsData,
      investment_transactions: investmentsData,
      securities: Array.from(securitiesMap.values()),
      as_of: new Date().toISOString(),
      request_ids: {
        holdings: holdingsResponse.data?.request_id,
        transactions: investmentTransactionsResponse.data?.request_id
      }
    };

    return res.json({
      success: true,
      investments: responsePayload,
      investments_transactions: investmentTransactionsResponse.data
    });
  } catch (error) {
    console.error('Plaid get investments error:', error);

    const status = error.response?.status || 500;
    const message = error.response?.data?.error_message || error.message;

    if (status === 400 || status === 401 || status === 403) {
      await User.findByIdAndUpdate(req.user.id, {
        $unset: { plaidAccessToken: 1, plaidItemId: 1, plaidCursor: 1 },
        $set: { plaidInvestments: [] }
      });
    }
    let responseMessage = message;
    const errorCode = error.response?.data?.error_code;
    if (errorCode === 'PRODUCT_NOT_ENABLED' || errorCode === 'PRODUCT_NOT_SUPPORTED') {
      responseMessage =
        'Investments access is not enabled for this item. Please reconnect your account to grant consent.';
    }

    return res.status(status).json({ success: false, message: responseMessage });
  }
};
