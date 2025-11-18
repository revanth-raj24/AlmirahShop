from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import razorpay
from datetime import datetime
from typing import List, Optional
import uvicorn
import os

# Initialize FastAPI app
app = FastAPI(title="Razorpay Payment Gateway Testing")

# Razorpay credentials (replace with your test keys)
RAZORPAY_KEY_ID = "rzp_test_Rh5oOT1q9ZkM4e"
RAZORPAY_KEY_SECRET = "2w9r8aT3hcLF8f3s9rFUQCgH"

# Initialize Razorpay client
client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# In-memory storage for payment history (use database in production)
payment_history = []

# Pydantic models
class PaymentRequest(BaseModel):
    amount: float
    description: Optional[str] = "Payment for testing"
    customer_name: Optional[str] = "Test Customer"
    customer_email: Optional[str] = "test@example.com"
    customer_phone: Optional[str] = "9999999999"

class PaymentResponse(BaseModel):
    payment_link_id: str
    payment_link_url: str
    amount: float
    currency: str
    status: str
    created_at: str

class PaymentHistoryItem(BaseModel):
    payment_link_id: str
    order_id: str
    amount: float
    currency: str
    status: str
    customer_name: str
    customer_email: str
    created_at: str
    short_url: str

# Root endpoint with HTML UI
@app.get("/", response_class=HTMLResponse)
async def root():
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Razorpay Payment Gateway Testing</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
            }
            h1 {
                color: white;
                text-align: center;
                margin-bottom: 30px;
                font-size: 2.5em;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .card {
                background: white;
                border-radius: 15px;
                padding: 30px;
                margin-bottom: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 8px;
                color: #333;
                font-weight: 600;
            }
            input, textarea {
                width: 100%;
                padding: 12px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            input:focus, textarea:focus {
                outline: none;
                border-color: #667eea;
            }
            .btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 30px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                cursor: pointer;
                width: 100%;
                font-weight: 600;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            .btn:active {
                transform: translateY(0);
            }
            #result {
                margin-top: 20px;
                padding: 20px;
                border-radius: 8px;
                display: none;
            }
            .success {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            .error {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            .payment-link {
                word-break: break-all;
                background: #f8f9fa;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #e0e0e0;
            }
            th {
                background-color: #667eea;
                color: white;
                font-weight: 600;
            }
            tr:hover {
                background-color: #f8f9fa;
            }
            .status-badge {
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }
            .status-created { background-color: #fff3cd; color: #856404; }
            .status-paid { background-color: #d4edda; color: #155724; }
            .status-expired { background-color: #f8d7da; color: #721c24; }
            .refresh-btn {
                background: #28a745;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                margin-bottom: 15px;
            }
            .refresh-btn:hover {
                background: #218838;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Razorpay Payment Gateway Testing</h1>
            
            <div class="card">
                <h2>Create Payment Link</h2>
                <form id="paymentForm">
                    <div class="form-group">
                        <label for="amount">Amount (₹) *</label>
                        <input type="number" id="amount" name="amount" required min="1" step="0.01" placeholder="Enter amount">
                    </div>
                    <div class="form-group">
                        <label for="customer_name">Customer Name</label>
                        <input type="text" id="customer_name" name="customer_name" placeholder="John Doe">
                    </div>
                    <div class="form-group">
                        <label for="customer_email">Customer Email</label>
                        <input type="email" id="customer_email" name="customer_email" placeholder="john@example.com">
                    </div>
                    <div class="form-group">
                        <label for="customer_phone">Customer Phone</label>
                        <input type="tel" id="customer_phone" name="customer_phone" placeholder="9999999999">
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" rows="3" placeholder="Payment description"></textarea>
                    </div>
                    <button type="submit" class="btn">Generate Payment Link</button>
                </form>
                <div id="result"></div>
            </div>

            <div class="card">
                <h2>Payment History</h2>
                <button class="refresh-btn" onclick="loadHistory()">🔄 Refresh History</button>
                <div id="history"></div>
            </div>
        </div>

        <script>
            document.getElementById('paymentForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = {
                    amount: parseFloat(document.getElementById('amount').value),
                    customer_name: document.getElementById('customer_name').value || 'Test Customer',
                    customer_email: document.getElementById('customer_email').value || 'test@example.com',
                    customer_phone: document.getElementById('customer_phone').value || '9999999999',
                    description: document.getElementById('description').value || 'Payment for testing'
                };

                const resultDiv = document.getElementById('result');
                resultDiv.style.display = 'block';
                resultDiv.className = '';
                resultDiv.innerHTML = 'Processing...';

                try {
                    const response = await fetch('/api/create-payment-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });

                    const data = await response.json();

                    if (response.ok) {
                        resultDiv.className = 'success';
                        resultDiv.innerHTML = `
                            <h3>✅ Payment Link Created Successfully!</h3>
                            <p><strong>Payment Link ID:</strong> ${data.payment_link_id}</p>
                            <p><strong>Amount:</strong> ₹${data.amount}</p>
                            <p><strong>Status:</strong> ${data.status}</p>
                            <div class="payment-link">
                                <strong>Payment URL:</strong><br>
                                <a href="${data.payment_link_url}" target="_blank">${data.payment_link_url}</a>
                            </div>
                        `;
                        loadHistory();
                        document.getElementById('paymentForm').reset();
                    } else {
                        resultDiv.className = 'error';
                        resultDiv.innerHTML = `<h3>❌ Error:</h3><p>${data.detail}</p>`;
                    }
                } catch (error) {
                    resultDiv.className = 'error';
                    resultDiv.innerHTML = `<h3>❌ Error:</h3><p>${error.message}</p>`;
                }
            });

            async function loadHistory() {
                try {
                    const response = await fetch('/api/payment-history');
                    const data = await response.json();

                    const historyDiv = document.getElementById('history');
                    
                    if (data.length === 0) {
                        historyDiv.innerHTML = '<p>No payment history available.</p>';
                        return;
                    }

                    let tableHTML = `
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Payment Link</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    data.forEach(payment => {
                        const statusClass = payment.status.toLowerCase();
                        tableHTML += `
                            <tr>
                                <td>${new Date(payment.created_at).toLocaleString()}</td>
                                <td>${payment.customer_name}<br><small>${payment.customer_email}</small></td>
                                <td>₹${payment.amount}</td>
                                <td><span class="status-badge status-${statusClass}">${payment.status}</span></td>
                                <td><a href="${payment.short_url}" target="_blank">Open Link</a></td>
                                <td><button onclick="checkStatus('${payment.payment_link_id}')">Check Status</button></td>
                            </tr>
                        `;
                    });

                    tableHTML += '</tbody></table>';
                    historyDiv.innerHTML = tableHTML;
                } catch (error) {
                    console.error('Error loading history:', error);
                }
            }

            async function checkStatus(paymentLinkId) {
                try {
                    const response = await fetch(`/api/payment-status/${paymentLinkId}`);
                    const data = await response.json();
                    alert(`Payment Status: ${data.status}\nAmount: ₹${data.amount}\nCurrency: ${data.currency}`);
                    loadHistory();
                } catch (error) {
                    alert('Error checking status: ' + error.message);
                }
            }

            // Load history on page load
            loadHistory();
        </script>
    </body>
    </html>
    """
    return html_content

# API endpoint to create payment link
@app.post("/api/create-payment-link", response_model=PaymentResponse)
async def create_payment_link(payment: PaymentRequest):
    try:
        # Convert amount to paise (smallest currency unit)
        amount_in_paise = int(payment.amount * 100)
        
        # Create payment link
        payment_link_data = {
            "amount": amount_in_paise,
            "currency": "INR",
            "description": payment.description,
            "customer": {
                "name": payment.customer_name,
                "email": payment.customer_email,
                "contact": payment.customer_phone
            },
            "notify": {
                "sms": True,
                "email": True
            },
            "reminder_enable": True,
            "callback_url": "http://localhost:8000/api/payment-callback",
            "callback_method": "get"
        }
        
        payment_link = client.payment_link.create(payment_link_data)
        
        # Store in history
        history_item = {
            "payment_link_id": payment_link['id'],
            "order_id": payment_link.get('order_id', ''),
            "amount": payment.amount,
            "currency": "INR",
            "status": payment_link['status'],
            "customer_name": payment.customer_name,
            "customer_email": payment.customer_email,
            "created_at": datetime.fromtimestamp(payment_link['created_at']).isoformat(),
            "short_url": payment_link['short_url']
        }
        payment_history.append(history_item)
        
        return PaymentResponse(
            payment_link_id=payment_link['id'],
            payment_link_url=payment_link['short_url'],
            amount=payment.amount,
            currency="INR",
            status=payment_link['status'],
            created_at=datetime.fromtimestamp(payment_link['created_at']).isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# API endpoint to get payment history
@app.get("/api/payment-history", response_model=List[PaymentHistoryItem])
async def get_payment_history():
    return payment_history

# API endpoint to check payment status
@app.get("/api/payment-status/{payment_link_id}")
async def get_payment_status(payment_link_id: str):
    try:
        payment_link = client.payment_link.fetch(payment_link_id)
        
        # Update history
        for item in payment_history:
            if item['payment_link_id'] == payment_link_id:
                item['status'] = payment_link['status']
        
        return {
            "payment_link_id": payment_link['id'],
            "status": payment_link['status'],
            "amount": payment_link['amount'] / 100,
            "currency": payment_link['currency'],
            "created_at": datetime.fromtimestamp(payment_link['created_at']).isoformat(),
            "paid_at": datetime.fromtimestamp(payment_link['paid_at']).isoformat() if payment_link.get('paid_at') else None
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Callback endpoint for payment success/failure
@app.get("/api/payment-callback")
async def payment_callback(request: Request):
    params = dict(request.query_params)
    # Log the callback for testing
    print(f"Payment callback received: {params}")
    return RedirectResponse(url="/")

# Webhook endpoint for Razorpay webhooks
@app.post("/api/webhook")
async def webhook(request: Request):
    try:
        payload = await request.body()
        signature = request.headers.get('X-Razorpay-Signature')
        
        # Verify webhook signature
        # client.utility.verify_webhook_signature(payload.decode(), signature, RAZORPAY_KEY_SECRET)
        
        event = await request.json()
        print(f"Webhook received: {event}")
        
        # Handle different webhook events
        if event['event'] == 'payment_link.paid':
            # Update payment history
            payment_link_id = event['payload']['payment_link']['entity']['id']
            for item in payment_history:
                if item['payment_link_id'] == payment_link_id:
                    item['status'] = 'paid'
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8005)