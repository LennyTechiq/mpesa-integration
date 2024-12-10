//index.js
const express = require("express");
const axios = require("axios")
const app = express();
require("dotenv").config();
const cors = require("cors");

const port = process.env.PORT || 8080;

//required middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

app.get("/", (req, res) => {
  res.send(`<h1>App is running on port: ${port} </h1>`);
});

// Authorization middleware
const tokenMiddleware = (async (req, res, next) => {
    try {
      // Encode consumer key and secret in base64
      const auth = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
      ).toString("base64");
  
      // Make an HTTP GET request using axios
      const MPESA_BASE_URL = process.env.MPESA_ENVIRONMENT === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

      const resp = await axios.get(
        `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            authorization: `Basic ${auth}`,
          },
        }
      );
  
      // Get the token from the response
      token = resp.data.access_token;
  
      // Store the token in the request object for downstream middleware/routes
      req.mpesaToken = token;
  
      // Call the next middleware
      next();
    } catch (error) {
      // Handle errors and return a response
      return res.status(500).json({
        error: error.message,
      });
    }
  });  

//stk push
app.post("/stk", tokenMiddleware, async(req , res)=>{
    //token
    //res.json(req.mpesaToken)

    const {phoneNumber, amount} = req.body

    try {
        const MPESA_BASE_URL = process.env.MPESA_ENVIRONMENT === "live"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

      const date = new Date();
      const timestamp =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);
   
      const password = Buffer.from(
        process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
      ).toString("base64");
   
      const formattedPhone = `254${phoneNumber.slice(-9)}`
      const response = await axios.post(
        `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
        {
          BusinessShortCode: process.env.MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline", //CustomerBuyGoodsOnline - for till
          Amount: amount,
          PartyA: formattedPhone,
          PartyB: process.env.MPESA_SHORTCODE, //till number for tills
          PhoneNumber: formattedPhone,
          CallBackURL: "https://mydomain.com/callback-url-path",
          AccountReference: phoneNumber,
          TransactionDesc: "anything here",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.status(200).json({message: `STK sent successfully to ${phoneNumber}`, data: response.data });
    } catch (error) {
        return res.status(500).json({
            error: error.message,
          });
    }
})

//stk query
app.post("/stkquery", tokenMiddleware, (req , res)=>{
    //token
    res.json(req.mpesaToken)
})

app.listen(port, () => console.log(`server up and running at port: ${port}`));