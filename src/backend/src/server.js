require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { connectDB } = require('./config/db');
const authRoute = require('./routes/authRoute.js');
const plaidRoute = require('./routes/plaidRoute.js');

const app = express();

app.use(express.json());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
  	origin: 'http://localhost:5173',
	credentials: true, 
}));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoute);
app.use('/api/plaid', plaidRoute);

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log('Server started on PORT:', PORT);
	});
});
