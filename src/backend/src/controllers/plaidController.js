const User = require('../models/User.js');
const { plaidClient, getProducts, getCountryCodes } = require('../services/plaid.js');

function getRedirectUri() {
  return process.env.PLAID_REDIRECT_URI || undefined;
}

exports.createLinkToken = async (req, res) => {
  try {
		const user = await User.findById(req.user.id).select('verified');
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
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: req.user.id
      },
      client_name: process.env.PLAID_CLIENT_NAME || 'Fin Tool',
      country_codes: getCountryCodes(),
      products: getProducts(),
      language: process.env.PLAID_LANGUAGE || 'en',
      redirect_uri: getRedirectUri()
    });

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
          plaidItemId: 1
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
    const user = await User.findById(req.user.id).select('+plaidAccessToken +plaidItemId +plaidCursor');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!user.plaidAccessToken) {
      return res.json({ success: true, item_id: user.plaidItemId, transactions: [] });
    }

    // Iterate /transactions/sync
    let cursor = user.plaidCursor || null; // null means "give me full history"
    let added = [];
    let modified = [];
    let removed = [];
    let hasMore = true;

    while (hasMore) {
      const syncResp = await plaidClient.transactionsSync({
        access_token: user.plaidAccessToken,
        cursor,
      });

      const data = syncResp.data;
      added.push(...data.added);
      modified.push(...data.modified);
      removed.push(...data.removed);
      hasMore = data.has_more;
      cursor = data.next_cursor;
    }

    // Persist the new cursor so next call only fetches deltas
    if (cursor !== user.plaidCursor) {
      user.plaidCursor = cursor;
      await user.save();
    }

    const compareAsc = (a, b) => (a.date > b.date) - (a.date < b.date);
    const recent = [...added, ...modified].sort(compareAsc).slice(-25).reverse(); // newest first

    return res.json({
      success: true,
      item_id: user.plaidItemId,
      latest_transactions: recent,
      removed,
    });

  } catch (error) {
    console.error('Plaid get transactions error', error);
    const status = error.response?.status || 500;
    const message = error.response?.data?.error_message || error.message;

    if (status === 400 || status === 401) {
      await User.findByIdAndUpdate(req.user.id, {
        $unset: { plaidAccessToken: 1, plaidItemId: 1, plaidCursor: 1 }
      });
    }

    return res.status(status).json({ success: false, message });
  }
};